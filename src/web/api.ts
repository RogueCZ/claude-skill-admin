export interface Root { label: string; path: string }
export interface Item {
  id: string; rootLabel: string; type: "skill" | "command";
  name: string; description: string; path: string; isSymlink: boolean;
}
export interface FileNode { name: string; path: string; type: "file" | "dir"; children?: FileNode[] }

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.json().catch(() => ({})) as { error?: string }).error ?? r.statusText);
  return r.json() as Promise<T>;
}

export const getRoots = () => fetch("/api/roots").then(j<Root[]>);
export const getItems = () => fetch("/api/items").then(j<Item[]>);
export const getFiles = (id: string) => fetch(`/api/items/${id}/files`).then(j<FileNode[]>);
export const getFile = async (path: string) => {
  const r = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.text();
};
export const putFile = (path: string, content: string) =>
  fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: "PUT", body: content }).then(j<{ ok: true }>);
export const createItem = (type: string, rootLabel: string, name: string) =>
  fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, rootLabel, name }) }).then(j<{ id: string; path: string }>);
export const addFile = (id: string, relName: string, content: string) =>
  fetch(`/api/items/${id}/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relName, content }) }).then(j<{ path: string }>);
export const deleteFile = (path: string) =>
  fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: "DELETE" }).then(j<{ ok: true }>);
export const deleteItem = (id: string) =>
  fetch(`/api/items/${id}`, { method: "DELETE" }).then(j<{ ok: true }>);
