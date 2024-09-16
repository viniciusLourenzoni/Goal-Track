
import {
  Dialog
} from "./components/ui/dialog";
import { CreateGoal } from "./components/create-goal";
import { Summary } from "./components/summary";
import { useEffect, useState } from "react";
import { EmptyGoals } from "./components/empty-goals";

export function App() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetch('http://localhost:3333/summary')
      .then(response => response.json())
      .then(data => {
        setSummary(data.summary)
      })
  }, [])

  return (
    <Dialog>

      {summary?.total > 0 ? <Summary /> : <EmptyGoals />}

      <CreateGoal />
    </Dialog>
  );
}
