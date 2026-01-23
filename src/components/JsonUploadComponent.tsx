import React, { useState, useRef } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Upload, X, CheckCircle, AlertTriangle, Info, Clipboard } from 'lucide-react';
import { TronPanel } from './TronPanel';
import { TronButton } from './TronButton';

interface JsonUploadComponentProps {
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

type ImportMode = 'file' | 'paste';

export function JsonUploadComponent({ onClose, onSuccess }: JsonUploadComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('file');
  const [jsonText, setJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importJsonWithSchemaEvolution = useAction(api.leadsActions.importJsonWithSchemaEvolution);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('No files selected');
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    // Validate file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      setError('File size must be less than 4MB');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Read the file as text
      const fileText = await file.text();
      
      // Parse JSON
      let jsonData;
      try {
        jsonData = JSON.parse(fileText);
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please check your file syntax.');
      }
      
      // Ensure we have an array of leads
      let leadsArray: any[] = [];
      if (Array.isArray(jsonData)) {
        leadsArray = jsonData;
      } else if (jsonData.opportunities && Array.isArray(jsonData.opportunities)) {
        leadsArray = jsonData.opportunities;
      } else {
        throw new Error('Invalid JSON format. Expected an array of leads or an object with an "opportunities" array.');
      }

      if (leadsArray.length === 0) {
        throw new Error('No leads found in the uploaded file');
      }

      // Import the leads using the dynamic schema evolution action
      const result = await importJsonWithSchemaEvolution({
        jsonData: leadsArray,
        sourceFile: file.name,
      });

      setUploadResult(result);
      onSuccess?.(result);

    } catch (err) {
      console.error('Error processing uploaded file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handlePasteJson = async () => {
    if (!jsonText.trim()) {
      setError('Please paste JSON text');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Parse JSON
      let jsonData;
      try {
        jsonData = JSON.parse(jsonText);
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please check your JSON syntax.');
      }
      
      // Ensure we have an array of leads
      let leadsArray: any[] = [];
      if (Array.isArray(jsonData)) {
        leadsArray = jsonData;
      } else if (jsonData.opportunities && Array.isArray(jsonData.opportunities)) {
        leadsArray = jsonData.opportunities;
      } else {
        throw new Error('Invalid JSON format. Expected an array of leads or an object with an "opportunities" array.');
      }

      if (leadsArray.length === 0) {
        throw new Error('No leads found in the pasted JSON');
      }

      // Import the leads using the dynamic schema evolution action
      const result = await importJsonWithSchemaEvolution({
        jsonData: leadsArray,
        sourceFile: 'pasted-json',
      });

      setUploadResult(result);
      setJsonText(''); // Clear the textarea
      onSuccess?.(result);

    } catch (err) {
      console.error('Error processing pasted JSON:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <TronPanel className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" title="Import JSON Leads" icon={<Upload className="w-5 h-5" />}>
        <div className="flex items-center justify-end mb-4">
          <TronButton
            onClick={onClose}
            variant="ghost"
            color="orange"
            size="sm"
            icon={<X className="w-6 h-6" />}
          />
        </div>

        {!uploadResult && !error && (
          <div className="space-y-4">
            <div className="bg-tron-bg-card p-4 rounded-lg border border-tron-cyan/20">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-tron-cyan mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-tron-white mb-2">
                    JSON Import Instructions
                  </h3>
                  <ul className="text-sm text-tron-gray space-y-1">
                    <li>• Upload a JSON file or paste JSON text containing an array of lead objects</li>
                    <li>• Missing columns will be automatically added with default values</li>
                    <li>• New columns in your file will be dynamically added to the schema</li>
                    <li>• File format can be: <code className="text-tron-cyan">[{"{lead1}"}, {"{lead2}"}]</code> or <code className="text-tron-cyan">{"{opportunities: [...]}"}</code></li>
                    <li>• Maximum file size: 4MB</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 border-b border-tron-cyan/20">
              <button
                onClick={() => {
                  setImportMode('file');
                  setError(null);
                }}
                className={`px-4 py-2 font-medium transition-colors ${
                  importMode === 'file'
                    ? 'text-tron-cyan border-b-2 border-tron-cyan'
                    : 'text-tron-gray hover:text-tron-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload File
                </div>
              </button>
              <button
                onClick={() => {
                  setImportMode('paste');
                  setError(null);
                }}
                className={`px-4 py-2 font-medium transition-colors ${
                  importMode === 'paste'
                    ? 'text-tron-cyan border-b-2 border-tron-cyan'
                    : 'text-tron-gray hover:text-tron-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4" />
                  Paste JSON
                </div>
              </button>
            </div>

            {isProcessing ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tron-cyan mx-auto mb-4"></div>
                <p className="text-tron-gray">
                  {importMode === 'file' ? 'Processing uploaded file...' : 'Processing pasted JSON...'}
                </p>
              </div>
            ) : (
              <>
                {importMode === 'file' ? (
                  <div
                    className={`w-full border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${ dragOver ? 'border-tron-cyan bg-tron-bg-card' : 'border-tron-cyan/20 hover:border-tron-cyan' }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={openFileDialog}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-tron-gray mx-auto mb-4" />
                      <p className="text-lg font-medium text-tron-white mb-2">
                        Drop your JSON file here or click to browse
                      </p>
                      <p className="text-sm text-tron-gray">
                        Maximum file size: 4MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-tron-white mb-2">
                        Paste JSON Text
                      </label>
                      <textarea
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        placeholder='Paste your JSON here, e.g., [{"title": "Lead 1", ...}, {"title": "Lead 2", ...}] or {"opportunities": [...]}'
                        className="w-full h-64 px-4 py-3 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:border-tron-cyan focus:ring-1 focus:ring-tron-cyan font-mono text-sm resize-y"
                      />
                    </div>
                    <TronButton
                      onClick={handlePasteJson}
                      variant="primary"
                      color="cyan"
                      className="w-full"
                      disabled={!jsonText.trim() || isProcessing}
                    >
                      Import Pasted JSON
                    </TronButton>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="bg-neon-error/20 p-4 rounded-lg border border-neon-error">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-neon-error mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-neon-error mb-1">
                    Import Error
                  </h3>
                  <p className="text-sm text-neon-error">{error}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <TronButton
                onClick={() => {
                  setError(null);
                  setUploadResult(null);
                  setJsonText('');
                }}
                variant="primary"
                color="cyan"
              >
                Try Again
              </TronButton>
              <TronButton
                onClick={onClose}
                variant="outline"
                color="orange"
              >
                Close
              </TronButton>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="space-y-4">
            <div className="bg-neon-success/20 p-4 rounded-lg border border-neon-success">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-neon-success mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-neon-success mb-2">
                    Import Successful!
                  </h3>
                  <div className="text-sm text-neon-success space-y-1">
                    <p>• Imported {uploadResult.importedCount} leads</p>
                    {uploadResult.schemaChanges && uploadResult.schemaChanges.length > 0 && (
                      <div>
                        <p className="font-medium mt-2 mb-1">Schema Changes:</p>
                        <ul className="list-disc list-inside ml-2">
                          {uploadResult.schemaChanges.map((change: string, index: number) => (
                            <li key={index}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <TronButton
                onClick={onClose}
                variant="primary"
                color="cyan"
              >
                Close
              </TronButton>
              <TronButton
                onClick={() => {
                  setUploadResult(null);
                  setError(null);
                  setJsonText('');
                  setImportMode('file');
                }}
                variant="outline"
                color="cyan"
              >
                Import Another
              </TronButton>
            </div>
          </div>
        )}
      </TronPanel>
    </div>
  );
}
