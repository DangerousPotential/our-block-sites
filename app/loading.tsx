export default function Loading() {
  return (
    <main className="lobby-loading">
      <output>
        <h1>See you downstairs.</h1>
        <p>Opening Our Block…</p>
        <progress aria-label="Loading Our Block" />
      </output>
    </main>
  );
}
