import type { FileNode } from "../api.js";

export function FileTree(props: {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const render = (nodes: FileNode[], depth: number) =>
    nodes.map((n) => (
      <div key={n.path}>
        {n.type === "file" ? (
          <button
            className={"file" + (n.path === props.selectedPath ? " active" : "")}
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => props.onSelect(n.path)}>
            {n.name}
          </button>
        ) : (
          <div className="dir" style={{ paddingLeft: 8 + depth * 12 }}>{n.name}/</div>
        )}
        {n.children && render(n.children, depth + 1)}
      </div>
    ));
  return <div className="filetree">{render(props.nodes, 0)}</div>;
}
