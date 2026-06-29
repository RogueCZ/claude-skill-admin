export function Toolbar(props: {
  dirty: boolean;
  canSave: boolean;
  onSave: () => void;
  onNew: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="toolbar">
      <strong>skill-admin</strong>
      <span className="spacer" />
      <button onClick={props.onNew}>New</button>
      <button disabled={!props.canSave || !props.dirty} onClick={props.onSave}>
        Save{props.dirty ? " •" : ""}
      </button>
      <button className="danger" disabled={!props.canSave} onClick={props.onDelete}>
        Delete
      </button>
    </div>
  );
}
