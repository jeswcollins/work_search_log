import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '../../style.css';
import App from './App.jsx';
import Today from './pages/Today.jsx';
import Week from './pages/Week.jsx';
import Edit from './pages/Edit.jsx';
import Dreams from './pages/Dreams.jsx';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Today />} />
        <Route path="week" element={<WeekRedirect />} />
        <Route path="week/:start" element={<Week />} />
        <Route path="entries/:id/edit" element={<Edit />} />
        <Route path="dreams" element={<Dreams />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

function WeekRedirect() {
  const today = new Date();
  const dow = today.getDay();
  today.setDate(today.getDate() - dow);
  const iso = today.toISOString().slice(0, 10);
  return <Navigate to={`/week/${iso}`} replace />;
}
