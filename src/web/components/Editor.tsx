import Monaco from "@monaco-editor/react";

export function Editor(props: {
  value: string;
  language: string;
  onChange: (v: string) => void;
}) {
  return (
    <Monaco
      height="100%"
      language={props.language}
      value={props.value}
      onChange={(v) => props.onChange(v ?? "")}
      options={{ minimap: { enabled: false }, wordWrap: "on", fontSize: 13 }}
    />
  );
}
