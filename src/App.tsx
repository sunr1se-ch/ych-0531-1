import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import DehumidifierList from "@/pages/DehumidifierList";
import DehumidifierDetail from "@/pages/DehumidifierDetail";
import DefrostTodo from "@/pages/DefrostTodo";
import Collections from "@/pages/Collections";
import DataEntry from "@/pages/DataEntry";
import InspectionWorkbench from "@/pages/InspectionWorkbench";
import { useStore } from '@/store/useStore';

export default function App() {
  const { fetchSystemConfig } = useStore();

  useEffect(() => {
    fetchSystemConfig();
  }, [fetchSystemConfig]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DehumidifierList />} />
          <Route path="/dehumidifier/:id" element={<DehumidifierDetail />} />
          <Route path="/defrost-todo" element={<DefrostTodo />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/inspection" element={<InspectionWorkbench />} />
        </Route>
      </Routes>
    </Router>
  );
}
