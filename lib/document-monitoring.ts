import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface DocumentAccessLog {
  id?: string;
  document_id: string;
  user_id: string;
  access_type: 'view' | 'download' | 'acknowledge' | 'print';
  ip_address?: string;
  user_agent?: string;
  access_duration_ms?: number;
  file_size_bytes?: number;
  success: boolean;
  error_message?: string;
  timestamp: string;
}

export interface DocumentAccessQuery {
  document_id?: string;
  user_id?: string;
  access_type?: string;
  start_date?: string;
  end_date?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export class DocumentMonitoringService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Log document access
   */
  async logDocumentAccess(entry: Omit<DocumentAccessLog, 'id' | 'timestamp'>): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('document_access_logs')
        .insert({
          document_id: entry.document_id,
          user_id: entry.user_id,
          access_type: entry.access_type,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          access_duration_ms: entry.access_duration_ms,
          file_size_bytes: entry.file_size_bytes,
          success: entry.success,
          error_message: entry.error_message,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error logging document access:', error);
      throw error;
    }
  }

  /**
   * Log document view
   */
  async logDocumentView(
    documentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    accessDurationMs?: number
  ): Promise<string> {
    return this.logDocumentAccess({
      document_id: documentId,
      user_id: userId,
      access_type: 'view',
      ip_address: ipAddress,
      user_agent: userAgent,
      access_duration_ms: accessDurationMs,
      success: true
    });
  }

  /**
   * Log document download
   */
  async logDocumentDownload(
    documentId: string,
    userId: string,
    fileSizeBytes: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logDocumentAccess({
      document_id: documentId,
      user_id: userId,
      access_type: 'download',
      ip_address: ipAddress,
      user_agent: userAgent,
      file_size_bytes: fileSizeBytes,
      success: true
    });
  }

  /**
   * Log document acknowledgment
   */
  async logDocumentAcknowledgment(
    documentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logDocumentAccess({
      document_id: documentId,
      user_id: userId,
      access_type: 'acknowledge',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log failed document access
   */
  async logFailedDocumentAccess(
    documentId: string,
    userId: string,
    accessType: string,
    errorMessage: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logDocumentAccess({
      document_id: documentId,
      user_id: userId,
      access_type: (['view','download','acknowledge','print'].includes(accessType) ? accessType : 'view') as 'view' | 'download' | 'acknowledge' | 'print',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_message: errorMessage
    });
  }

  /**
   * Query document access logs
   */
  async queryDocumentAccess(query: DocumentAccessQuery): Promise<DocumentAccessLog[]> {
    try {
      let supabaseQuery = this.supabase
        .from('document_access_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      // Apply filters
      if (query.document_id) {
        supabaseQuery = supabaseQuery.eq('document_id', query.document_id);
      }

      if (query.user_id) {
        supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
      }

      if (query.access_type) {
        supabaseQuery = supabaseQuery.eq('access_type', query.access_type);
      }

      if (query.start_date) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.start_date);
      }

      if (query.end_date) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.end_date);
      }

      if (query.success !== undefined) {
        supabaseQuery = supabaseQuery.eq('success', query.success);
      }

      // Apply pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      type DBRow = {
        id: string;
        document_id: string;
        user_id: string;
        access_type: 'view' | 'download' | 'acknowledge' | 'print';
        ip_address?: string | null;
        user_agent?: string | null;
        access_duration_ms?: number | null;
        file_size_bytes?: number | null;
        success: boolean;
        error_message?: string | null;
        timestamp: string;
      };

      return (data as DBRow[]).map((row) => ({
        id: row.id,
        document_id: row.document_id,
        user_id: row.user_id,
        access_type: row.access_type,
        ip_address: row.ip_address ?? undefined,
        user_agent: row.user_agent ?? undefined,
        access_duration_ms: row.access_duration_ms ?? undefined,
        file_size_bytes: row.file_size_bytes ?? undefined,
        success: row.success,
        error_message: row.error_message ?? undefined,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error querying document access logs:', error);
      return [];
    }
  }

  /**
   * Get document access statistics
   */
  async getDocumentAccessStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<{
    total_accesses: number;
    successful_accesses: number;
    failed_accesses: number;
    unique_documents: number;
    unique_users: number;
    access_type_breakdown: Array<{ access_type: string; count: number }>;
    top_documents: Array<{ document_id: string; count: number }>;
    top_users: Array<{ user_id: string; count: number }>;
    total_download_size: number;
    average_access_duration: number;
  }> {
    try {
      let query = this.supabase.from('document_access_logs').select('*');

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = data as Array<{ success: boolean; document_id: string; user_id: string; access_type: string; file_size_bytes?: number | null; access_duration_ms?: number | null }>;
      const total_accesses = rows.length;
      const successful_accesses = rows.filter((log) => log.success).length;
      const failed_accesses = total_accesses - successful_accesses;
      const unique_documents = new Set(rows.map((log) => log.document_id)).size;
      const unique_users = new Set(rows.map((log) => log.user_id)).size;

      // Access type breakdown
      const accessTypeCounts: Record<string, number> = {};
      rows.forEach((log) => {
        accessTypeCounts[log.access_type] = (accessTypeCounts[log.access_type] || 0) + 1;
      });

      const access_type_breakdown = Object.entries(accessTypeCounts)
        .map(([access_type, count]) => ({ access_type, count }))
        .sort((a, b) => b.count - a.count);

      // Top documents
      const documentCounts: Record<string, number> = {};
      rows.forEach((log) => {
        documentCounts[log.document_id] = (documentCounts[log.document_id] || 0) + 1;
      });

      const top_documents = Object.entries(documentCounts)
        .map(([document_id, count]) => ({ document_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Top users
      const userCounts: Record<string, number> = {};
      rows.forEach((log) => {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      });

      const top_users = Object.entries(userCounts)
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Total download size
      const total_download_size = rows
        .filter((log) => log.access_type === 'download' && !!log.file_size_bytes)
        .reduce((sum, log) => sum + (log.file_size_bytes || 0), 0);

      // Average access duration
      const accessDurations = rows
        .filter((log) => !!log.access_duration_ms)
        .map((log) => log.access_duration_ms as number);
      
      const average_access_duration = accessDurations.length > 0 
        ? accessDurations.reduce((sum: number, duration: number) => sum + duration, 0) / accessDurations.length
        : 0;

      return {
        total_accesses,
        successful_accesses,
        failed_accesses,
        unique_documents,
        unique_users,
        access_type_breakdown,
        top_documents,
        top_users,
        total_download_size,
        average_access_duration
      };
    } catch (error) {
      console.error('Error getting document access statistics:', error);
      return {
        total_accesses: 0,
        successful_accesses: 0,
        failed_accesses: 0,
        unique_documents: 0,
        unique_users: 0,
        access_type_breakdown: [],
        top_documents: [],
        top_users: [],
        total_download_size: 0,
        average_access_duration: 0
      };
    }
  }

  /**
   * Get suspicious document access patterns
   */
  async getSuspiciousAccessPatterns(): Promise<{
    rapid_access: Array<{ user_id: string; document_id: string; count: number; time_window: string }>;
    unusual_hours: Array<{ user_id: string; document_id: string; timestamp: string }>;
    large_downloads: Array<{ user_id: string; document_id: string; file_size_bytes: number; timestamp: string }>;
    failed_access_attempts: Array<{ user_id: string; document_id: string; error_message: string; count: number }>;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Rapid access (more than 10 accesses in 1 hour)
      const { data: rapidAccess } = await this.supabase
        .from('document_access_logs')
        .select('user_id, document_id, timestamp')
        .gte('timestamp', oneHourAgo.toISOString())
        .eq('success', true);

      const rapidAccessCounts: Record<string, number> = {};
      rapidAccess?.forEach((log: { user_id: string; document_id: string }) => {
        const key = `${log.user_id}-${log.document_id}`;
        rapidAccessCounts[key] = (rapidAccessCounts[key] || 0) + 1;
      });

      const rapid_access = Object.entries(rapidAccessCounts)
        .filter((entry) => entry[1] > 10)
        .map(([key, count]) => {
          const [user_id, document_id] = key.split('-');
          return { user_id, document_id, count, time_window: '1 hour' };
        });

      // Unusual hours (access between 11 PM and 5 AM)
      const { data: unusualHours } = await this.supabase
        .from('document_access_logs')
        .select('user_id, document_id, timestamp')
        .gte('timestamp', oneDayAgo.toISOString())
        .eq('success', true);

      const unusual_hours = unusualHours?.filter((log: { timestamp: string }) => {
        const hour = new Date(log.timestamp).getHours();
        return hour >= 23 || hour <= 5;
      }).map((log: { user_id: string; document_id: string; timestamp: string }) => ({
        user_id: log.user_id,
        document_id: log.document_id,
        timestamp: log.timestamp
      })) || [];

      // Large downloads (more than 10MB)
      const { data: largeDownloads } = await this.supabase
        .from('document_access_logs')
        .select('user_id, document_id, file_size_bytes, timestamp')
        .gte('timestamp', oneDayAgo.toISOString())
        .eq('access_type', 'download')
        .eq('success', true)
        .gte('file_size_bytes', 10 * 1024 * 1024); // 10MB

      const large_downloads = largeDownloads?.map((log: { user_id: string; document_id: string; file_size_bytes: number; timestamp: string }) => ({
        user_id: log.user_id,
        document_id: log.document_id,
        file_size_bytes: log.file_size_bytes,
        timestamp: log.timestamp
      })) || [];

      // Failed access attempts
      const { data: failedAccess } = await this.supabase
        .from('document_access_logs')
        .select('user_id, document_id, error_message')
        .gte('timestamp', oneDayAgo.toISOString())
        .eq('success', false);

      const failedAccessCounts: Record<string, { count: number; error_message: string | null }> = {};
      failedAccess?.forEach((log: { user_id: string; document_id: string; error_message: string | null }) => {
        const key = `${log.user_id}-${log.document_id}`;
        if (!failedAccessCounts[key]) {
          failedAccessCounts[key] = { count: 0, error_message: log.error_message };
        }
        failedAccessCounts[key].count++;
      });

      const failed_access_attempts = Object.entries(failedAccessCounts)
        .filter((entry) => entry[1].count > 3)
        .map(([key, data]) => {
          const [user_id, document_id] = key.split('-');
          return { user_id, document_id, error_message: data.error_message ?? '', count: data.count };
        });

      return {
        rapid_access,
        unusual_hours,
        large_downloads,
        failed_access_attempts
      };
    } catch (error) {
      console.error('Error getting suspicious access patterns:', error);
      return {
        rapid_access: [],
        unusual_hours: [],
        large_downloads: [],
        failed_access_attempts: []
      };
    }
  }

  /**
   * Clean up old document access logs
   */
  async cleanupOldLogs(retentionDays: number = 180): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await this.supabase
        .from('document_access_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up old document access logs:', error);
      return 0;
    }
  }
}

// Utility functions
export async function logDocumentView(
  documentId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  accessDurationMs?: number
): Promise<string> {
  const service = new DocumentMonitoringService();
  return service.logDocumentView(documentId, userId, ipAddress, userAgent, accessDurationMs);
}

export async function logDocumentDownload(
  documentId: string,
  userId: string,
  fileSizeBytes: number,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new DocumentMonitoringService();
  return service.logDocumentDownload(documentId, userId, fileSizeBytes, ipAddress, userAgent);
}

export async function logDocumentAcknowledgment(
  documentId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new DocumentMonitoringService();
  return service.logDocumentAcknowledgment(documentId, userId, ipAddress, userAgent);
}

export async function logFailedDocumentAccess(
  documentId: string,
  userId: string,
  accessType: string,
  errorMessage: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const service = new DocumentMonitoringService();
  return service.logFailedDocumentAccess(documentId, userId, accessType, errorMessage, ipAddress, userAgent);
}
