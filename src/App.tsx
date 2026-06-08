import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import DehumidifierList from "@/pages/DehumidifierList";
import DehumidifierDetail from "@/pages/DehumidifierDetail";
import DefrostTodo from "@/pages/DefrostTodo";
import Collections from "@/pages/Collections";
import DataEntry from "@/pages/DataEntry";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DehumidifierList />} />
          <Route path="/dehumidifier/:id" element={<DehumidifierDetail />} />
          <Route path="/defrost-todo" element={<DefrostTodo />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/data-entry" element={<DataEntry />} />
        </Route>
      </Routes>
    </Router>
  );
}
