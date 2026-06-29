import { useEffect, useState, useCallback } from "react";
import * as api from "./api.js";
import type { Item, FileNode } from "./api.js";
import { Sidebar } from "./components/Sidebar.js";
import { FileTree } from "./components/FileTree.js";
import { Editor } from "./components/Editor.js";
import { Toolbar } from "./components/Toolbar.js";

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [roots, setRoots] = useState<api.Root[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.getItems());
      setRoots(await api.getRoots());
    } catch (e) { setError(String(e)); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function openItem(item: Item) {
    setSelected(item);
    setError(null);
    try {
      const tree = await api.getFiles(item.id);
      setFiles(tree);
      setFilePath(null); setContent(""); setDirty(false);
      const first = item.type === "command" ? tree[0]?.path : findSkillMd(tree);
      if (first) await openFile(first);
    } catch (e) { setError(String(e)); }
  }

  async function openFile(path: string) {
    try {
      const text = await api.getFile(path);
      setFilePath(path);
      setContent(text);
      setDirty(false);
    } catch (e) {
      setError(String(e));
      setDirty(false);
    }
  }

  async function save() {
    if (!filePath) return;
    try { await api.putFile(filePath, content); setDirty(false); await refresh(); }
    catch (e) { setError(String(e)); }
  }

  async function onNew() {
    const type = prompt("Type: skill or command?", "skill");
    if (type !== "skill" && type !== "command") return;
    const rootLabel = prompt(`Root label (${roots.map((r) => r.label).join(", ")})`, roots[0]?.label);
    const name = prompt("Name (a-z, 0-9, -_.)");
    if (!rootLabel || !name) return;
    try { await api.createItem(type, rootLabel, name); await refresh(); }
    catch (e) { setError(String(e)); }
  }

  async function onDelete() {
    if (!selected) return;
    if (!confirm(`Move "${selected.name}" to trash?`)) return;
    try {
      await api.deleteItem(selected.id);
      setSelected(null); setFiles([]); setFilePath(null); setContent("");
      await refresh();
    } catch (e) { setError(String(e)); }
  }

  const language = filePath?.endsWith(".md") ? "markdown" : "plaintext";

  return (
    <div className="app">
      <Toolbar dirty={dirty} canSave={!!selected} onSave={save} onNew={onNew} onDelete={onDelete} />
      {error && <div className="error" onClick={() => setError(null)}>{error}</div>}
      <div className="body">
        <Sidebar items={items} query={query} onQuery={setQuery}
          selectedId={selected?.id ?? null} onSelect={openItem} />
        {selected?.type === "skill" && (
          <FileTree nodes={files} selectedPath={filePath} onSelect={openFile} />
        )}
        <div className="editor">
          {filePath
            ? <Editor value={content} language={language}
                onChange={(v) => { setContent(v); setDirty(true); }} />
            : <div className="empty">Select a skill or command.</div>}
        </div>
      </div>
    </div>
  );
}

function findSkillMd(nodes: FileNode[]): string | undefined {
  return nodes.find((n) => n.name === "SKILL.md")?.path ?? nodes.find((n) => n.type === "file")?.path;
}
