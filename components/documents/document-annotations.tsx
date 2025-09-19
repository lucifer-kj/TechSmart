"use client";

import { useEffect, useState } from "react";
import { useRealtime } from "@/hooks/useRealtime";

type Annotation = {
	id: string;
	document_id: string;
	created_at: string;
	created_by: string;
	text: string;
};

type Props = {
	documentId: string;
};

// Read-only annotation feed that updates in realtime
export function DocumentAnnotations({ documentId }: Props) {
	const [annotations, setAnnotations] = useState<Annotation[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch(`/api/customer-portal/documents/${documentId}/annotations`, { cache: 'no-store' });
				if (res.ok) setAnnotations((await res.json()).annotations || []);
			} catch {
				// Ignore fetch errors silently
			}
		})();
	}, [documentId]);

	useRealtime<Annotation>({ table: 'document_annotations', filter: `document_id=eq.${documentId}` }, ({ eventType, new: newRow, old }) => {
		if (eventType === 'INSERT' && newRow) setAnnotations((prev) => [...prev, newRow as Annotation]);
		else if (eventType === 'UPDATE' && newRow) {
			const updated = newRow as Annotation;
			setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
		} else if (eventType === 'DELETE' && old) {
			const deleted = old as Annotation;
			setAnnotations((prev) => prev.filter((a) => a.id !== deleted.id));
		}
	});

	if (!annotations.length) return null;

	return (
		<div className="mt-4 border rounded p-3 bg-gray-50 dark:bg-gray-900/30">
			<p className="text-xs text-gray-500 mb-2">Annotations</p>
			<ul className="space-y-2 text-sm">
				{annotations.map((a) => (
					<li key={a.id} className="border-b pb-2 last:border-b-0">
						<div className="flex items-center justify-between text-xs text-gray-500">
							<span>{new Date(a.created_at).toLocaleString()}</span>
							<span>{a.created_by}</span>
						</div>
						<p className="mt-1 whitespace-pre-wrap">{a.text}</p>
					</li>
				))}
			</ul>
		</div>
	);
}


