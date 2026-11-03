import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

type BoundaryState = { error: Error | null };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Bangnet Manager render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{fontFamily:"Arial,sans-serif",maxWidth:640,margin:"48px auto",padding:24,color:"#0f172a"}}>
          <h1 style={{fontSize:24,fontWeight:700}}>Aplikasi gagal dimuat</h1>
          <p style={{marginTop:12}}>Terjadi kesalahan saat menampilkan halaman. Kirimkan pesan di bawah ini agar masalah dapat diperbaiki.</p>
          <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginTop:16,padding:16,borderRadius:12,background:"#f1f5f9",fontSize:13}}>{this.state.error.message}</pre>
          <button style={{marginTop:16,padding:"10px 16px",border:0,borderRadius:8,background:"#0f766e",color:"white"}} onClick={() => window.location.reload()}>Muat ulang</button>
        </main>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (root) {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>
    );
  } catch (error) {
    root.innerHTML = '<main style="font-family:Arial,sans-serif;padding:24px;color:#991b1b"><h1>Aplikasi gagal dimulai</h1><p>Silakan muat ulang halaman dan kirimkan pesan kesalahan dari konsol browser.</p></main>';
    console.error("Bangnet Manager startup error:", error);
  }
}
