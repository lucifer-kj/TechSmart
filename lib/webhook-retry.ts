import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export class WebhookRetryService {
  private supabase: SupabaseClient;
  private config: RetryConfig;

  constructor(config: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.config = config;
  }

  async retryWebhookDelivery(
    webhookId: string,
    webhookUrl: string,
    payload: unknown,
    headers: Record<string, string> = {}
  ): Promise<{ success: boolean; attempts: number; error?: string }> {
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < this.config.maxRetries) {
      attempts++;
      
      try {
        // Log retry attempt
        await this.logRetryAttempt(webhookId, attempts, webhookUrl);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(payload),
          // Add timeout
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          // Success - log completion
          await this.logRetrySuccess(webhookId, attempts);
          return { success: true, attempts };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      } catch (error) {
        lastError = (error as Error).message;
        
        // Log retry failure
        await this.logRetryFailure(webhookId, attempts, lastError);

        // If this was the last attempt, don't wait
        if (attempts >= this.config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempts - 1),
          this.config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const finalDelay = delay + jitter;

        console.log(`Webhook ${webhookId} attempt ${attempts} failed, retrying in ${finalDelay}ms`);
        await this.sleep(finalDelay);
      }
    }

    // All retries failed
    await this.logRetryExhausted(webhookId, attempts, lastError!);
    return { success: false, attempts, error: lastError };
  }

  async scheduleRetry(
    webhookId: string,
    webhookUrl: string,
    payload: unknown,
    headers: Record<string, string> = {},
    delayMs: number = 5000
  ): Promise<void> {
    // Store retry job in database for later processing
    await this.supabase
      .from('webhook_retry_queue')
      .insert({
        webhook_id: webhookId,
        webhook_url: webhookUrl,
        payload: JSON.stringify(payload),
        headers: JSON.stringify(headers),
        scheduled_for: new Date(Date.now() + delayMs).toISOString(),
        attempts: 0,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    console.log(`Scheduled retry for webhook ${webhookId} in ${delayMs}ms`);
  }

  async processRetryQueue(): Promise<void> {
    const now = new Date().toISOString();
    
    // Get pending retries that are due
    const { data: pendingRetries } = await this.supabase
      .from('webhook_retry_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10); // Process in batches

    if (!pendingRetries || pendingRetries.length === 0) {
      return;
    }

    console.log(`Processing ${pendingRetries.length} webhook retries`);

    for (const retry of pendingRetries) {
      try {
        // Mark as processing
        await this.supabase
          .from('webhook_retry_queue')
          .update({ status: 'processing' })
          .eq('id', retry.id);

        const result = await this.retryWebhookDelivery(
          retry.webhook_id,
          retry.webhook_url,
          JSON.parse(retry.payload),
          JSON.parse(retry.headers || '{}')
        );

        if (result.success) {
          // Mark as completed
          await this.supabase
            .from('webhook_retry_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              attempts: result.attempts
            })
            .eq('id', retry.id);
        } else {
          // Check if we should retry again
          const newAttempts = retry.attempts + result.attempts;
          
          if (newAttempts >= this.config.maxRetries) {
            // Mark as failed
            await this.supabase
              .from('webhook_retry_queue')
              .update({ 
                status: 'failed',
                error: result.error,
                attempts: newAttempts,
                failed_at: new Date().toISOString()
              })
              .eq('id', retry.id);
          } else {
            // Schedule next retry
            const delay = Math.min(
              this.config.baseDelay * Math.pow(this.config.backoffMultiplier, newAttempts - 1),
              this.config.maxDelay
            );
            
            await this.supabase
              .from('webhook_retry_queue')
              .update({ 
                status: 'pending',
                attempts: newAttempts,
                scheduled_for: new Date(Date.now() + delay).toISOString()
              })
              .eq('id', retry.id);
          }
        }

      } catch (error) {
        console.error(`Error processing retry ${retry.id}:`, error);
        
        // Mark as failed
        await this.supabase
          .from('webhook_retry_queue')
          .update({ 
            status: 'failed',
            error: (error as Error).message,
            failed_at: new Date().toISOString()
          })
          .eq('id', retry.id);
      }
    }
  }

  private async logRetryAttempt(webhookId: string, attempt: number, webhookUrl: string): Promise<void> {
    await this.supabase
      .from('webhook_retry_logs')
      .insert({
        webhook_id: webhookId,
        attempt,
        webhook_url: webhookUrl,
        status: 'attempting',
        created_at: new Date().toISOString()
      });
  }

  private async logRetrySuccess(webhookId: string, attempts: number): Promise<void> {
    await this.supabase
      .from('webhook_retry_logs')
      .insert({
        webhook_id: webhookId,
        attempt: attempts,
        status: 'success',
        created_at: new Date().toISOString()
      });
  }

  private async logRetryFailure(webhookId: string, attempt: number, error: string): Promise<void> {
    await this.supabase
      .from('webhook_retry_logs')
      .insert({
        webhook_id: webhookId,
        attempt,
        status: 'failure',
        error,
        created_at: new Date().toISOString()
      });
  }

  private async logRetryExhausted(webhookId: string, attempts: number, error: string): Promise<void> {
    await this.supabase
      .from('webhook_retry_logs')
      .insert({
        webhook_id: webhookId,
        attempt: attempts,
        status: 'exhausted',
        error,
        created_at: new Date().toISOString()
      });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Utility function for immediate retry
export async function retryWebhookDelivery(
  webhookId: string,
  webhookUrl: string,
  payload: unknown,
  headers: Record<string, string> = {}
): Promise<{ success: boolean; attempts: number; error?: string }> {
  const retryService = new WebhookRetryService();
  return retryService.retryWebhookDelivery(webhookId, webhookUrl, payload, headers);
}

// Utility function for scheduled retry
export async function scheduleWebhookRetry(
  webhookId: string,
  webhookUrl: string,
  payload: unknown,
  headers: Record<string, string> = {},
  delayMs: number = 5000
): Promise<void> {
  const retryService = new WebhookRetryService();
  return retryService.scheduleRetry(webhookId, webhookUrl, payload, headers, delayMs);
}
