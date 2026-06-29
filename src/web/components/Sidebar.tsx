import type { Item } from "../api.js";

export function Sidebar(props: {
  items: Item[];
  query: string;
  onQuery: (q: string) => void;
  selectedId: string | null;
  onSelect: (item: Item) => void;
}) {
  const filtered = props.items.filter((i) =>
    (i.name + " " + i.description).toLowerCase().includes(props.query.toLowerCase()),
  );
  const byRoot = new Map<string, Item[]>();
  for (const i of filtered) {
    if (!byRoot.has(i.rootLabel)) byRoot.set(i.rootLabel, []);
    byRoot.get(i.rootLabel)!.push(i);
  }
  return (
    <aside className="sidebar">
      <input className="search" placeholder="Search…" value={props.query}
        onChange={(e) => props.onQuery(e.target.value)} />
      {[...byRoot.entries()].map(([root, items]) => (
        <div key={root} className="root-group">
          <h3>{root}</h3>
          {(["skill", "command"] as const).map((type) => {
            const ofType = items.filter((i) => i.type === type);
            if (!ofType.length) return null;
            return (
              <div key={type} className="type-group">
                <h4>{type === "skill" ? "Skills" : "Commands"}</h4>
                {ofType.map((i) => (
                  <button key={i.id}
                    className={"item" + (i.id === props.selectedId ? " active" : "")}
                    onClick={() => props.onSelect(i)}>
                    {i.name}{i.isSymlink ? " 🔗" : ""}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
