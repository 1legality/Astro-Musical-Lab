import React from 'react';
import DrumPatternSection from './DrumPatternSection';

interface DrumPatternLibraryProps {
  sections: string[];
}

const DrumPatternLibrary: React.FC<DrumPatternLibraryProps> = ({ sections }) => (
  <>
    {sections.map((section) => (
      <div className="my-6" key={section}>
        <DrumPatternSection section={section} />
      </div>
    ))}
  </>
);

export default DrumPatternLibrary;
