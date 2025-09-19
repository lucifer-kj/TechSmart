"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/useRealtime";

type DocumentRecord = {
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

type Props = {
	documents: DocumentRecord[];
	onDownload: (documentId: string) => void;
};

export function LiveDocumentViewer({ documents, onDownload }: Props) {
	const [docs, setDocs] = useState<DocumentRecord[]>(documents);

	useEffect(() => setDocs(documents), [documents]);

	useRealtime<DocumentRecord>({ table: 'documents' }, ({ eventType, new: newRow, old }) => {
		if (eventType === 'INSERT' && newRow) setDocs((prev) => [newRow as DocumentRecord, ...prev]);
		else if (eventType === 'UPDATE' && newRow) {
			const updated = newRow as DocumentRecord;
			setDocs((prev) => prev.map((d) => (d.uuid === updated.uuid ? updated : d)));
		} else if (eventType === 'DELETE' && old) {
			const deleted = old as DocumentRecord;
			setDocs((prev) => prev.filter((d) => d.uuid !== deleted.uuid));
		}
	});

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{docs.map((document) => (
					<Card key={document.uuid} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm truncate">{document.file_name}</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
								<span>{new Date(document.date_created).toLocaleDateString()}</span>
								<span>{document.attachment_source}</span>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" className="flex-1" onClick={() => onDownload(document.uuid)}>
									Download
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}


