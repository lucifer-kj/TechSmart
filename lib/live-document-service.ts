export type LiveDocument = {
	uuid: string;
	file_name: string;
	file_type: string;
	file_size: number;
	attachment_source: string;
	date_created: string;
	downloadUrl: string;
	previewUrl?: string;
	category: 'quote' | 'invoice' | 'photo' | 'document';
};

export async function fetchJobDocuments(jobId: string): Promise<LiveDocument[]> {
	const res = await fetch(`/api/customer-portal/documents?jobId=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
	if (!res.ok) throw new Error('Failed to load documents');
	const data = await res.json();
	return data.documents || [];
}


