import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground md:p-10">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <Button type="submit">Test</Button>
      </form>
      {greetMsg ? (
        <p className="mt-4 text-sm text-muted-foreground">{greetMsg}</p>
      ) : null}
    </main>
  );
}

export default App;
