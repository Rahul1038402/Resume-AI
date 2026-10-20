import { PersonalInfo } from '../../../types/index';

interface PersonalInfoEditorProps {
    personalInfo: PersonalInfo;
    updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void;
}

export const PersonalInfoEditor = ({ personalInfo, updatePersonalInfo }: PersonalInfoEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                <div>
                    <label className="rb-label">First Name <span className='text-red-400'>*</span></label>
                    <input
                        type="text"
                        value={personalInfo.firstName}
                        onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                        className="rb-input"
                        placeholder="John"
                    />
                </div>

                <div>
                    <label className="rb-label">Last Name <span className='text-red-400'>*</span></label>
                    <input
                        type="text"
                        value={personalInfo.lastName}
                        onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                        className="rb-input"
                        placeholder="Doe"
                    />
                </div>

                <div>
                    <label className="rb-label">Email <span className='text-red-400'>*</span></label>
                    <input
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => updatePersonalInfo('email', e.target.value)}
                        className="rb-input"
                        placeholder="john.doe@example.com"
                    />
                </div>

                <div>
                    <label className="rb-label">Phone <span className='text-red-400'>*</span></label>
                    <input
                        type="tel"
                        value={personalInfo.phone}
                        onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                        className="rb-input"
                        placeholder="+1 234 567 8900"
                    />
                </div>

                <div>
                    <label className="rb-label">Location <span className='text-red-400'>*</span></label>
                    <input
                        type="text"
                        value={personalInfo.location}
                        onChange={(e) => updatePersonalInfo('location', e.target.value)}
                        className="rb-input"
                        placeholder="San Francisco, CA"
                    />
                </div>

                <div>
                    <label className="rb-label">Target Job Title <span className='text-red-400'>*</span></label>
                    <input
                        type="text"
                        value={personalInfo.targetJobTitle}
                        onChange={(e) => updatePersonalInfo('targetJobTitle', e.target.value)}
                        className="rb-input"
                        placeholder="Software Engineer"
                    />
                </div>

                <div>
                    <label className="rb-label">LinkedIn URL</label>
                    <input
                        type="url"
                        value={personalInfo.linkedinUrl}
                        onChange={(e) => updatePersonalInfo('linkedinUrl', e.target.value)}
                        className="rb-input"
                        placeholder="https://linkedin.com/in/johndoe"
                    />
                </div>

                <div>
                    <label className="rb-label">GitHub URL</label>
                    <input
                        type="url"
                        value={personalInfo.githubUrl}
                        onChange={(e) => updatePersonalInfo('githubUrl', e.target.value)}
                        className="rb-input"
                        placeholder="https://github.com/johndoe"
                    />
                </div>
            </div>
        </div>
    );
};