import React from 'react';
import DrumPatternSection from './DrumPatternSection';

const DrumPatternLibrary: React.FC = () => (
    <div className="space-y-8">
        <DrumPatternSection />
        <div className="text-center text-sm text-base-content/60">
            <p>
                Drum patterns adapting content from{' '}
                <a
                    href="https://shittyrecording.studio/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-hover link-primary"
                >
                    Shitty Recording Studio
                </a>
                . Huge thanks for their incredible work documenting these grooves!
            </p>
        </div>
    </div>
);

export default DrumPatternLibrary;
