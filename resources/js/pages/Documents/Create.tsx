import { useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileImage, FileText, Loader2, CheckCircle } from 'lucide-react';
import { FormLayout, FormSection, Field, inputCls } from '@/components/layout/FormLayout';
import { cn } from '@/lib/utils';

const csrf = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

const DOC_TYPES = [
    { value: 'bank_statement',        label: 'Bank Statement' },
    { value: 'credit_card_statement', label: 'Credit Card Statement' },
    { value: 'salary_slip',           label: 'Salary Slip' },
    { value: 'receipt',               label: 'Receipt' },
    { value: 'invoice',               label: 'Invoice' },
    { value: 'investment_statement',  label: 'Investment Statement' },
    { value: 'tax_document',          label: 'Tax Document' },
    { value: 'other',                 label: 'Other' },
];

export default function DocumentsCreate() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [docType, setDocType] = useState('bank_statement');
    const [name, setName] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const mutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error('No file selected');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', docType);
            if (name.trim()) fd.append('name', name.trim());
            const r = await fetch('/api/v1/documents', {
                method: 'POST', credentials: 'include',
                headers: { 'X-CSRF-TOKEN': csrf() },
                body: fd,
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.message ?? 'Upload failed');
            return j.data;
        },
        onSuccess: () => router.visit('/documents'),
    });

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) setFile(f);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!file) e.file = 'Please select a file to upload';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        mutation.mutate();
    };

    return (
        <>
            <Head title="Upload Document" />
            <FormLayout title="Upload Document" subtitle="AI will extract transactions automatically after upload" backHref="/documents" onSave={handleSave} saving={mutation.isPending} saveLabel="Upload & Process">

                <FormSection title="Document Type">
                    <div className="grid grid-cols-2 gap-2">
                        {DOC_TYPES.map(t => (
                            <button key={t.value} type="button" onClick={() => setDocType(t.value)}
                                className={cn('rounded-xl border px-4 py-2.5 text-sm font-medium text-left transition-all',
                                    docType === t.value ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-white/10 text-white/50 hover:border-white/25')}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </FormSection>

                <FormSection title="File Upload">
                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => !file && inputRef.current?.click()}
                        className={cn(
                            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 transition-all',
                            file ? 'border-emerald-500/40 bg-emerald-500/5 cursor-default' : 'cursor-pointer',
                            dragging ? 'border-blue-500 bg-blue-500/8' : !file ? 'border-white/15 hover:border-white/30' : ''
                        )}
                    >
                        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }}
                            className="hidden" />

                        {file ? (
                            <>
                                <CheckCircle size={36} className="text-emerald-400 mb-3" />
                                {file.type.includes('image') ? <FileImage size={20} className="text-white/30 mb-2" /> : <FileText size={20} className="text-white/30 mb-2" />}
                                <p className="text-sm font-semibold text-white">{file.name}</p>
                                <p className="text-xs text-white/40 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                                    className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors">
                                    Remove file
                                </button>
                            </>
                        ) : (
                            <>
                                <Upload size={32} className="text-white/30 mb-3" />
                                <p className="text-sm text-white/60 font-medium">Drop your file here</p>
                                <p className="text-xs text-white/30 mt-1">or click to browse</p>
                                <p className="text-xs text-white/20 mt-2">Supported: PDF, JPG, PNG · Max 10 MB</p>
                            </>
                        )}
                    </div>
                    {errors.file && <p className="text-xs text-red-400 mt-1">{errors.file}</p>}
                </FormSection>

                <FormSection title="Optional Details">
                    <Field label="Document Name" hint="Leave blank to use the filename">
                        <input value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. HDFC April Statement" className={inputCls} />
                    </Field>
                </FormSection>

                {mutation.isPending && (
                    <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 border border-blue-500/25 p-4">
                        <Loader2 size={18} className="animate-spin text-blue-400" />
                        <div>
                            <p className="text-sm text-blue-300 font-medium">Uploading document…</p>
                            <p className="text-xs text-blue-400/60">OCR processing will start in the background</p>
                        </div>
                    </div>
                )}
            </FormLayout>
        </>
    );
}
