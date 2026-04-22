import { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

export default function CodeEditor({ initialCode = '', language = 'cpp', onChange }) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const initialCodeRef = useRef(initialCode);
  const languageRef = useRef(language);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    initialCodeRef.current = initialCode;
  }, [initialCode]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const newEditor = monaco.editor.create(containerRef.current, {
        value: initialCodeRef.current,
        language: languageRef.current,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 16 },
      });

      newEditor.onDidChangeModelContent(() => {
        if (editorRef.current) {
          onChangeRef.current?.(editorRef.current.getValue());
        }
      });
      editorRef.current = newEditor;
    }

    return () => {
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && initialCode !== editor.getValue()) {
      editor.setValue(initialCode);
    }
  }, [initialCode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-700"
    />
  );
}
