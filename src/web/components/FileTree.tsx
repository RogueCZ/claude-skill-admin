import type { FileNode } from "../api.js";

export function FileTree(props: {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onNewFile?: () => void;
  onDeleteFile?: (path: string) => void;
}) {
  const render = (nodes: FileNode[], depth: number) =>
    nodes.map((n) => (
      <div key={n.path}>
        {n.type === "file" ? (
          <div className="file-row" style={{ paddingLeft: 8 + depth * 12 }}>
            <button
              className={"file" + (n.path === props.selectedPath ? " active" : "")}
              onClick={() => props.onSelect(n.path)}>
              {n.name}
            </button>
            {props.onDeleteFile && (
              <button
                className="file-delete"
                onClick={() => props.onDeleteFile!(n.path)}
                title="Delete file">
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="dir" style={{ paddingLeft: 8 + depth * 12 }}>{n.name}/</div>
        )}
        {n.children && render(n.children, depth + 1)}
      </div>
    ));
  return (
    <div className="filetree">
      {props.onNewFile && (
        <div className="filetree-toolbar">
          <button onClick={props.onNewFile} title="Add a new file (use / to create subfolders)">+ New file</button>
        </div>
      )}
      {render(props.nodes, 0)}
    </div>
  );
}
