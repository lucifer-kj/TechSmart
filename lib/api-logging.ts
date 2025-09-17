import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface APILogEntry {
  id?: string;
  api_name: string;
  endpoint: string;
  method: string;
  request_payload?: unknown;
  response_payload?: unknown;
  status_code: number;
  response_time_ms: number;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  timestamp: string;
}

export interface APILogQuery {
  api_name?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  has_error?: boolean;
  limit?: number;
  offset?: number;
}

export class APILoggingService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Log an API call
   */
  async logAPICall(entry: Omit<APILogEntry, 'id' | 'timestamp'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('api_logs')
        .insert({
          api_name: entry.api_name,
          endpoint: entry.endpoint,
          method: entry.method,
          request_payload: entry.request_payload ? JSON.stringify(entry.request_payload) : null,
          response_payload: entry.response_payload ? JSON.stringify(entry.response_payload) : null,
          status_code: entry.status_code,
          response_time_ms: entry.response_time_ms,
          user_id: entry.user_id,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          error_message: entry.error_message,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error logging API call:', error);
      throw error;
    }
  }

  /**
   * Log ServiceM8 API call
   */
  async logServiceM8Call(
    endpoint: string,
    method: string,
    requestPayload: unknown,
    responsePayload: unknown,
    statusCode: number,
    responseTimeMs: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<string> {
    return this.logAPICall({
      api_name: 'servicem8',
      endpoint,
      method,
      request_payload: requestPayload,
      response_payload: responsePayload,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage
    });
  }

  /**
   * Log Supabase API call
   */
  async logSupabaseCall(
    endpoint: string,
    method: string,
    requestPayload: unknown,
    responsePayload: unknown,
    statusCode: number,
    responseTimeMs: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<string> {
    return this.logAPICall({
      api_name: 'supabase',
      endpoint,
      method,
      request_payload: requestPayload,
      response_payload: responsePayload,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage
    });
  }

  /**
   * Log external API call
   */
  async logExternalAPICall(
    apiName: string,
    endpoint: string,
    method: string,
    requestPayload: unknown,
    responsePayload: unknown,
    statusCode: number,
    responseTimeMs: number,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<string> {
    return this.logAPICall({
      api_name: apiName,
      endpoint,
      method,
      request_payload: requestPayload,
      response_payload: responsePayload,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage
    });
  }

  /**
   * Query API logs
   */
  async queryAPILogs(query: APILogQuery): Promise<APILogEntry[]> {
    try {
      let supabaseQuery = this.supabase
        .from('api_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (query.api_name) {
        supabaseQuery = supabaseQuery.eq('api_name', query.api_name);
      }

      if (query.endpoint) {
        supabaseQuery = supabaseQuery.ilike('endpoint', `%${query.endpoint}%`);
      }

      if (query.method) {
        supabaseQuery = supabaseQuery.eq('method', query.method);
      }

      if (query.status_code) {
        supabaseQuery = supabaseQuery.eq('status_code', query.status_code);
      }

      if (query.user_id) {
        supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
      }

      if (query.start_date) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.start_date);
      }

      if (query.end_date) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.end_date);
      }

      if (query.has_error !== undefined) {
        if (query.has_error) {
          supabaseQuery = supabaseQuery.not('error_message', 'is', null);
        } else {
          supabaseQuery = supabaseQuery.is('error_message', null);
        }
      }

      // Apply pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      type DBRow = {
        id: string;
        api_name: string;
        endpoint: string;
        method: string;
        request_payload: string | null;
        response_payload: string | null;
        status_code: number;
        response_time_ms: number;
        user_id?: string;
        ip_address?: string;
        user_agent?: string;
        error_message?: string | null;
        timestamp: string;
      };

      return (data as DBRow[]).map((row) => ({
        id: row.id,
        api_name: row.api_name,
        endpoint: row.endpoint,
        method: row.method,
        request_payload: row.request_payload ? JSON.parse(row.request_payload) : null,
        response_payload: row.response_payload ? JSON.parse(row.response_payload) : null,
        status_code: row.status_code,
        response_time_ms: row.response_time_ms,
        user_id: row.user_id,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        error_message: row.error_message ?? undefined,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error querying API logs:', error);
      return [];
    }
  }

  /**
   * Get API statistics
   */
  async getAPIStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    average_response_time: number;
    api_breakdown: Array<{ api_name: string; count: number; avg_response_time: number }>;
    endpoint_breakdown: Array<{ endpoint: string; count: number; avg_response_time: number }>;
    status_code_breakdown: Array<{ status_code: number; count: number }>;
    error_breakdown: Array<{ error_message: string; count: number }>;
  }> {
    try {
      let query = this.supabase.from('api_logs').select('*');

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = data as Array<{ status_code: number; api_name: string; response_time_ms: number; endpoint: string; error_message?: string | null }>;
      const total_calls = rows.length;
      const successful_calls = rows.filter((log) => log.status_code >= 200 && log.status_code < 300).length;
      const failed_calls = total_calls - successful_calls;
      const average_response_time = rows.reduce((sum, log) => sum + log.response_time_ms, 0) / (total_calls || 1);

      // API breakdown
      const apiCounts: Record<string, { count: number; total_time: number }> = {};
      rows.forEach((log) => {
        if (!apiCounts[log.api_name]) {
          apiCounts[log.api_name] = { count: 0, total_time: 0 };
        }
        apiCounts[log.api_name].count++;
        apiCounts[log.api_name].total_time += log.response_time_ms;
      });

      const api_breakdown = Object.entries(apiCounts).map(([api_name, stats]) => ({
        api_name,
        count: stats.count,
        avg_response_time: stats.total_time / stats.count
      }));

      // Endpoint breakdown
      const endpointCounts: Record<string, { count: number; total_time: number }> = {};
      rows.forEach((log) => {
        if (!endpointCounts[log.endpoint]) {
          endpointCounts[log.endpoint] = { count: 0, total_time: 0 };
        }
        endpointCounts[log.endpoint].count++;
        endpointCounts[log.endpoint].total_time += log.response_time_ms;
      });

      const endpoint_breakdown = Object.entries(endpointCounts)
        .map(([endpoint, stats]) => ({
          endpoint,
          count: stats.count,
          avg_response_time: stats.total_time / stats.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Status code breakdown
      const statusCounts: Record<number, number> = {};
      rows.forEach((log) => {
        statusCounts[log.status_code] = (statusCounts[log.status_code] || 0) + 1;
      });

      const status_code_breakdown = Object.entries(statusCounts)
        .map(([status_code, count]) => ({ status_code: parseInt(status_code), count }))
        .sort((a, b) => b.count - a.count);

      // Error breakdown
      const errorCounts: Record<string, number> = {};
      rows.forEach((log) => {
        if (log.error_message) {
          errorCounts[log.error_message] = (errorCounts[log.error_message] || 0) + 1;
        }
      });

      const error_breakdown = Object.entries(errorCounts)
        .map(([error_message, count]) => ({ error_message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      return {
        total_calls,
        successful_calls,
        failed_calls,
        average_response_time,
        api_breakdown,
        endpoint_breakdown,
        status_code_breakdown,
        error_breakdown
      };
    } catch (error) {
      console.error('Error getting API statistics:', error);
      return {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        average_response_time: 0,
        api_breakdown: [],
        endpoint_breakdown: [],
        status_code_breakdown: [],
        error_breakdown: []
      };
    }
  }

  /**
   * Clean up old API logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await this.supabase
        .from('api_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up old API logs:', error);
      return 0;
    }
  }

  /**
   * Get slow API calls
   */
  async getSlowAPICalls(
    thresholdMs: number = 5000,
    limit: number = 50
  ): Promise<APILogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('api_logs')
        .select('*')
        .gte('response_time_ms', thresholdMs)
        .order('response_time_ms', { ascending: false })
        .limit(limit);

      if (error) throw error;

      type DBRow = {
        id: string;
        api_name: string;
        endpoint: string;
        method: string;
        request_payload: string | null;
        response_payload: string | null;
        status_code: number;
        response_time_ms: number;
        user_id?: string;
        ip_address?: string;
        user_agent?: string;
        error_message?: string | null;
        timestamp: string;
      };

      return (data as DBRow[]).map((row) => ({
        id: row.id,
        api_name: row.api_name,
        endpoint: row.endpoint,
        method: row.method,
        request_payload: row.request_payload ? JSON.parse(row.request_payload) : null,
        response_payload: row.response_payload ? JSON.parse(row.response_payload) : null,
        status_code: row.status_code,
        response_time_ms: row.response_time_ms,
        user_id: row.user_id,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        error_message: row.error_message ?? undefined,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error getting slow API calls:', error);
      return [];
    }
  }
}

// Utility functions
export async function logServiceM8Call(
  endpoint: string,
  method: string,
  requestPayload: unknown,
  responsePayload: unknown,
  statusCode: number,
  responseTimeMs: number,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<string> {
  const service = new APILoggingService();
  return service.logServiceM8Call(
    endpoint,
    method,
    requestPayload,
    responsePayload,
    statusCode,
    responseTimeMs,
    userId,
    ipAddress,
    userAgent,
    errorMessage
  );
}

export async function logSupabaseCall(
  endpoint: string,
  method: string,
  requestPayload: unknown,
  responsePayload: unknown,
  statusCode: number,
  responseTimeMs: number,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<string> {
  const service = new APILoggingService();
  return service.logSupabaseCall(
    endpoint,
    method,
    requestPayload,
    responsePayload,
    statusCode,
    responseTimeMs,
    userId,
    ipAddress,
    userAgent,
    errorMessage
  );
}
