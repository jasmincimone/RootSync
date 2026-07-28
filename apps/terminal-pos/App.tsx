import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  StripeTerminalProvider,
  useStripeTerminal,
  type Reader,
} from "@stripe/stripe-terminal-react-native";

import {
  apiFetch,
  clearPosSession,
  loadPosSession,
  savePosSession,
  type PosSession,
} from "./src/api";

const DEFAULT_API = "https://rootsync.io";

function LoginScreen({
  onLoggedIn,
}: {
  onLoggedIn: (session: PosSession) => void;
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/vendor/pos/mobile-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        token?: string;
        expiresAt?: string;
        email?: string;
        displayName?: string;
        connectAccountId?: string;
      };
      if (!res.ok || !data.token) {
        const detail =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : res.status === 404
              ? "Login API not found on this server. Deploy RootSync POS APIs, or point API URL at your Mac (http://YOUR-MAC-IP:3001)."
              : `Login failed (HTTP ${res.status}).`;
        setError(detail);
        return;
      }
      const session: PosSession = {
        token: data.token,
        email: data.email || email.trim(),
        displayName: data.displayName || "Vendor",
        connectAccountId: data.connectAccountId || "",
        expiresAt: data.expiresAt || "",
        apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
      };
      await savePosSession(session);
      onLoggedIn(session);
    } catch {
      setError("Could not reach RootSync. Check API URL and network.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>RootSync Terminal</Text>
      <Text style={styles.sub}>Sign in with your vendor account to use the Stripe Reader M2.</Text>

      <Text style={styles.label}>API base URL</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        value={apiBaseUrl}
        onChangeText={setApiBaseUrl}
        placeholder="https://rootsync.io"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.btn} disabled={busy} onPress={() => void login()}>
        <Text style={styles.btnText}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function PosScreen({
  session,
  onLogout,
}: {
  session: PosSession;
  onLogout: () => void;
}) {
  const [discovered, setDiscovered] = useState<Reader.Type[]>([]);
  const [ready, setReady] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [dollars, setDollars] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("Initializing Terminal…");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amountCents = useMemo(() => {
    const n = Number.parseFloat(dollars);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }, [dollars]);

  const {
    initialize,
    discoverReaders,
    connectReader,
    connectedReader,
    retrievePaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    disconnectReader,
    cancelDiscovering,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      setDiscovered(readers);
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await initialize();
      if (cancelled) return;
      if (result.error) {
        setError(result.error.message);
        setStatus("Terminal failed to initialize.");
        return;
      }
      setReady(true);
      setStatus("Terminal ready. Discover your M2 next.");
      try {
        const res = await apiFetch(session, "/api/vendor/pos/connection-token", {
          method: "POST",
        });
        const data = (await res.json().catch(() => ({}))) as {
          locationId?: string;
          error?: string;
        };
        if (res.ok && data.locationId) setLocationId(data.locationId);
      } catch {
        // tokenProvider will still fetch secrets during discovery/connect
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialize, session]);

  async function scanReaders() {
    setError(null);
    setBusy(true);
    setStatus("Scanning for Bluetooth readers…");
    try {
      const result = await discoverReaders({
        discoveryMethod: "bluetoothScan",
        simulated: false,
      });
      if (result.error) {
        setError(result.error.message);
        setStatus("Discover failed.");
        return;
      }
      setStatus("Scan finished — tap Connect on your M2 below (keep Bluetooth on).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discover failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connect(reader: Reader.Type) {
    if (!locationId) {
      setError("Missing Terminal location from RootSync. Try signing out/in.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(`Connecting to ${reader.serialNumber || reader.deviceType}…`);
    try {
      await cancelDiscovering();
      const result = await connectReader(
        {
          reader,
          locationId,
        },
        "bluetoothScan",
      );
      if (result.error) {
        setError(result.error.message);
        setStatus("Connect failed.");
        return;
      }
      setStatus("Reader connected. Enter an amount and charge.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed.");
    } finally {
      setBusy(false);
    }
  }

  async function charge() {
    if (!connectedReader) {
      setError("Connect the M2 first.");
      return;
    }
    if (amountCents == null || amountCents < 50) {
      setError("Enter at least $0.50.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Creating payment…");
    try {
      const intentRes = await apiFetch(session, "/api/vendor/pos/terminal-intent", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          description: description.trim() || undefined,
        }),
      });
      const intentData = (await intentRes.json().catch(() => ({}))) as {
        error?: string;
        clientSecret?: string;
        orderId?: string;
      };
      if (!intentRes.ok || !intentData.clientSecret) {
        setError(intentData.error || "Could not create PaymentIntent.");
        setStatus("Charge failed.");
        return;
      }

      setStatus("Present card on the M2…");
      const retrieved = await retrievePaymentIntent(intentData.clientSecret);
      if (retrieved.error || !retrieved.paymentIntent) {
        setError(retrieved.error?.message || "Could not load PaymentIntent.");
        return;
      }

      const collected = await collectPaymentMethod({
        paymentIntent: retrieved.paymentIntent,
      });
      if (collected.error || !collected.paymentIntent) {
        setError(collected.error?.message || "Card collection canceled/failed.");
        setStatus("Ready to try again.");
        return;
      }

      setStatus("Confirming payment…");
      const confirmed = await confirmPaymentIntent({
        paymentIntent: collected.paymentIntent,
      });
      if (confirmed.error) {
        setError(confirmed.error.message);
        setStatus("Confirmation failed.");
        return;
      }

      setStatus(
        `Paid $${(amountCents / 100).toFixed(2)} · order ${intentData.orderId || "ok"} · transfer to ${session.connectAccountId}`,
      );
      setDollars("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Charge failed.");
      setStatus("Ready to try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>{session.displayName}</Text>
      <Text style={styles.sub}>
        Connected acct: {session.connectAccountId || "—"}
        {"\n"}
        Reader: {connectedReader?.serialNumber || connectedReader?.deviceType || "not connected"}
      </Text>

      {!connectedReader ? (
        <>
          <Pressable
            style={styles.btn}
            disabled={!ready || busy}
            onPress={() => void scanReaders()}
          >
            <Text style={styles.btnText}>{busy ? "Working…" : "Scan for M2"}</Text>
          </Pressable>
          {(discovered || []).map((reader) => (
            <Pressable
              key={reader.serialNumber || String(reader.id)}
              style={styles.secondaryBtn}
              disabled={busy}
              onPress={() => void connect(reader)}
            >
              <Text style={styles.secondaryBtnText}>
                Connect {reader.deviceType} {reader.serialNumber}
              </Text>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.label}>Amount (USD)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={dollars}
            onChangeText={setDollars}
            placeholder="25.00"
          />
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Market day sale"
          />
          <Pressable style={styles.btn} disabled={busy} onPress={() => void charge()}>
            <Text style={styles.btnText}>{busy ? "Processing…" : "Charge on M2"}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            disabled={busy}
            onPress={() => void disconnectReader()}
          >
            <Text style={styles.secondaryBtnText}>Disconnect reader</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.status}>{status}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      <Pressable
        style={[styles.secondaryBtn, { marginTop: 24 }]}
        onPress={() => {
          void clearPosSession().then(onLogout);
        }}
      >
        <Text style={styles.secondaryBtnText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function AppShell() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<PosSession | null>(null);

  useEffect(() => {
    void loadPosSession().then((s) => {
      setSession(s);
      setBooting(false);
    });
  }, []);

  const tokenProvider = useCallback(async () => {
    const current = session || (await loadPosSession());
    if (!current) {
      throw new Error("Not signed in");
    }
    const res = await apiFetch(current, "/api/vendor/pos/connection-token", {
      method: "POST",
    });
    const data = (await res.json().catch(() => ({}))) as { secret?: string; error?: string };
    if (!res.ok || !data.secret) {
      throw new Error(data.error || "Could not fetch connection token");
    }
    return data.secret;
  }, [session]);

  if (booting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <LoginScreen onLoggedIn={setSession} />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <StripeTerminalProvider logLevel="verbose" tokenProvider={tokenProvider}>
      <SafeAreaView style={styles.root}>
        <PosScreen session={session} onLogout={() => setSession(null)} />
        <StatusBar style="dark" />
      </SafeAreaView>
    </StripeTerminalProvider>
  );
}

export default function App() {
  return <AppShell />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8efe8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8efe8" },
  pad: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: "700", color: "#1c1917", marginBottom: 8 },
  sub: { fontSize: 14, color: "#57534e", marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#1c1917", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(28,25,23,0.15)",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1c1917",
  },
  btn: {
    marginTop: 18,
    backgroundColor: "#166534",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(28,25,23,0.2)",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  secondaryBtnText: { color: "#1c1917", fontWeight: "600" },
  status: { marginTop: 16, fontSize: 13, color: "#44403c", lineHeight: 18 },
  error: { marginTop: 10, color: "#b91c1c", fontSize: 13 },
});
