import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { useState } from "react";

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin
        ? { email, password }
        : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao fazer login");
        return;
      }

      // Reload page to trigger auth check
      window.location.reload();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.19 280), transparent)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.2 310), transparent)",
          }}
        />
      </div>
      <div className="relative flex flex-col items-center gap-6 p-10 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain" />
            <span className="text-3xl font-bold tracking-tight gradient-text">
              Agenda do CEO
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-center text-foreground">
            {isLogin ? "Bem-vindo de volta" : "Criar conta"}
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
            {isLogin
              ? "Faça login para acessar o painel de gestão de tarefas."
              : "Crie sua conta para começar a usar a Agenda do CEO."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLogin
            ? "Não tem conta? Criar conta"
            : "Já tem conta? Fazer login"}
        </button>
      </div>
    </div>
  );
}
