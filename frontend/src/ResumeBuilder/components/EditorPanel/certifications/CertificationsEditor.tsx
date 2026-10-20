import { Plus, Trash2 } from 'lucide-react';
import { Certification } from '../../../types/index';

interface CertificationsEditorProps {
    certifications: Certification[];
    addCertification: () => void;
    updateCertification: (id: string, field: keyof Certification, value: string) => void;
    deleteCertification: (id: string) => void;
}

export const CertificationsEditor = ({
    certifications,
    addCertification,
    updateCertification,
    deleteCertification
}: CertificationsEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Certifications & Achievements
            </h3>

            <button
                onClick={addCertification}
                className="        w-full px-4 py-2 
        border-2 border-dotted border-line-strong 
        border-line-bright
        rounded-lg 
        flex items-center justify-center gap-2 
        text-white
        hover:border-line-bright
        transition-colors
        bg-transparent"
            >
                <Plus size={16} />
                Add Certification
            </button>

            <div className="space-y-4">
                {certifications.map((cert) => (
                    <div key={cert.id} className="p-4 border border-line rounded-lg space-y-2.5">
                        <div className="flex justify-end">
                            <button
                                onClick={() => deleteCertification(cert.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="rb-label">Certification Name <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={cert.name}
                                onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                                className="rb-input"
                                placeholder="AWS Certified Developer"
                            />
                        </div>

                        <div>
                            <label className="rb-label">Issuing Organization <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={cert.issuer}
                                onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)}
                                className="rb-input"
                                placeholder="Amazon Web Services"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                            <div>
                                <label className="rb-label">Date Issued <span className='text-red-400'>*</span></label>
                                <input
                                    type="text"
                                    value={cert.date}
                                    onChange={(e) => updateCertification(cert.id, 'date', e.target.value)}
                                    className="rb-input"
                                    placeholder="Jan 2024"
                                />
                            </div>

                            <div>
                                <label className="rb-label">Credential ID</label>
                                <input
                                    type="text"
                                    value={cert.credentialId}
                                    onChange={(e) => updateCertification(cert.id, 'credentialId', e.target.value)}
                                    className="rb-input"
                                    placeholder="ABC123XYZ"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="rb-label">Credential URL</label>
                            <input
                                type="url"
                                value={cert.link}
                                onChange={(e) => updateCertification(cert.id, 'link', e.target.value)}
                                className="rb-input"
                                placeholder="https://credentials.example.com/..."
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};