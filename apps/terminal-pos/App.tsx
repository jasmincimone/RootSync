import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
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
  fetchConnectionToken,
  loadPosSession,
  savePosSession,
  type PosSession,
} from "./src/api";

const DEFAULT_API = "https://rootsync.io";

function formatUpdateEta(raw?: string | null): string {
  if (!raw) return " (often 5–15 minutes)";
  const m = /estimate(\d+)To(\d+)Minutes/i.exec(raw);
  if (m) return ` (about ${m[1]}–${m[2]} minutes)`;
  if (/estimateLessThan1Minute/i.test(raw)) return " (under 1 minute)";
  return ` (${raw})`;
}

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
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updatingFirmware, setUpdatingFirmware] = useState(false);
  const [posListings, setPosListings] = useState<
    {
      listingId: string;
      variantId: string | null;
      label: string;
      priceCents: number;
      listingType: string;
    }[]
  >([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [tab, setTab] = useState<"charge" | "sales">("charge");
  const [orders, setOrders] = useState<
    {
      id: string;
      status: string;
      totalCents: number;
      createdAt: string;
      itemLabel: string;
      items: { name: string; quantity: number; priceCents: number }[];
      paymentIntentId: string | null;
    }[]
  >([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);

  /** When true, a canceled discoverReaders result is expected (Connect / Stop scan). */
  const expectDiscoverCancelRef = useRef(false);
  /** Prevents initialize/token storm when the SDK recreates hook fns each render. */
  const didInitRef = useRef(false);
  const locationIdRef = useRef<string | null>(null);
  const connectInFlightRef = useRef(false);
  const updateInProgressRef = useRef(false);
  const connectReaderFnRef = useRef<
    ((reader: Reader.Type) => Promise<void>) | null
  >(null);

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
    cancelInstallingUpdate,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      setDiscovered(readers);
      if (readers.length === 0 || connectInFlightRef.current) return;
      const reader = readers[0];
      const label = reader.serialNumber || reader.deviceType || "reader";
      setStatus(`Found ${label} — connecting…`);
      void connectReaderFnRef.current?.(reader);
    },
    onDidStartInstallingUpdate: (update) => {
      updateInProgressRef.current = true;
      setUpdatingFirmware(true);
      const eta = formatUpdateEta(update?.estimatedUpdateTime);
      setError(null);
      setStatus(
        `Required M2 firmware update in progress${eta}. ` +
          "Leave this app open in the foreground, keep the phone next to the reader, and do not lock the screen until it finishes.",
      );
    },
    onDidReportReaderSoftwareUpdateProgress: (progress) => {
      updateInProgressRef.current = true;
      setUpdatingFirmware(true);
      const n = Number(progress);
      const pct = Number.isFinite(n) ? Math.round(n * (n <= 1 ? 100 : 1)) : null;
      setStatus(
        pct != null
          ? `M2 firmware update ${pct}% — keep the app open until this reaches 100%.`
          : `M2 firmware update in progress (${progress}) — keep the app open.`,
      );
    },
    onDidFinishInstallingUpdate: (result) => {
      updateInProgressRef.current = false;
      setUpdatingFirmware(false);
      if (result?.error) {
        const msg = result.error.message || "Reader software update failed.";
        setError(msg);
        setStatus(
          /interrupted/i.test(msg)
            ? "Firmware update was interrupted (app reload, Cancel, screen lock, or leaving Bluetooth range). Scan again and leave the app open for the full 5–15 minutes."
            : "Reader update failed. Scan again and leave the app open until it completes.",
        );
        connectInFlightRef.current = false;
        setBusy(false);
        return;
      }
      setStatus("Firmware update finished — finishing connect…");
    },
  });

  useEffect(() => {
    locationIdRef.current = locationId;
  }, [locationId]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const preData = await fetchConnectionToken(session);
        if (cancelled) return;
        if (preData.locationId) {
          locationIdRef.current = preData.locationId;
          setLocationId(preData.locationId);
        }

        const result = await initialize();
        if (cancelled) return;
        if (result.error) {
          setError(result.error.message || "Terminal initialize failed.");
          setStatus("Terminal failed to initialize.");
          return;
        }
        setReady(true);
        setStatus("Terminal ready. Tap Scan for M2.");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Terminal initialize failed.";
        setError(msg);
        setStatus("Terminal failed to initialize.");
        if (/session expired/i.test(msg)) onLogout();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once per mount — `initialize` identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  function isDiscoverCanceledMessage(message?: string | null) {
    return /cancel+ed/i.test(message || "");
  }

  async function scanReaders() {
    if (busy || connectInFlightRef.current) return;
    setError(null);
    setDiscovered([]);
    expectDiscoverCancelRef.current = false;
    setScanning(true);
    setStatus("Scanning… leave this screen open; Connect starts automatically when found.");
    try {
      const result = await discoverReaders({
        discoveryMethod: "bluetoothScan",
        simulated: false,
      });
      if (result.error) {
        const canceled =
          expectDiscoverCancelRef.current || isDiscoverCanceledMessage(result.error.message);
        if (canceled) return;
        setError(result.error.message);
        setStatus("Discover failed.");
        return;
      }
      if (!connectInFlightRef.current && !connectedReader) {
        setDiscovered([]);
        setStatus("Scan timed out. Tap Scan for M2 again (keep the reader awake).");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Discover failed.";
      if (expectDiscoverCancelRef.current || isDiscoverCanceledMessage(msg)) return;
      setError(msg);
      setStatus("Discover failed.");
    } finally {
      expectDiscoverCancelRef.current = false;
      setScanning(false);
    }
  }

  async function stopScan() {
    expectDiscoverCancelRef.current = true;
    try {
      await cancelDiscovering();
    } catch {
      // ignore
    }
    setScanning(false);
    setStatus("Scan stopped. Tap Scan for M2 to try again.");
  }

  async function connectToReader(reader: Reader.Type) {
    const loc = locationIdRef.current;
    if (!loc) {
      setError("Missing Terminal location from RootSync. Try signing out/in.");
      setStatus("Connect failed.");
      return;
    }
    if (connectInFlightRef.current) return;
    connectInFlightRef.current = true;
    updateInProgressRef.current = false;
    setUpdatingFirmware(false);
    setBusy(true);
    setError(null);
    setStatus(`Connecting to ${reader.serialNumber || reader.deviceType}…`);
    expectDiscoverCancelRef.current = true;
    setScanning(false);

    try {
      // Stop discovery before connect so scan + connect don't fight over Bluetooth.
      try {
        await cancelDiscovering();
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 400));

      // No short timeout: first connect often installs a required firmware update (5–15 min).
      // A previous 2-minute timeout was interrupting that update.
      const result = await connectReader({
        discoveryMethod: "bluetoothScan",
        reader,
        locationId: loc,
        autoReconnectOnUnexpectedDisconnect: true,
      });
      if (result.error) {
        setError(result.error.message);
        setStatus("Connect failed. Tap Scan for M2 and try again.");
        return;
      }
      setDiscovered([]);
      setStatus("Reader connected. Enter an amount and charge.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed.");
      setStatus("Connect failed. Tap Scan for M2 and try again.");
    } finally {
      connectInFlightRef.current = false;
      updateInProgressRef.current = false;
      setUpdatingFirmware(false);
      setBusy(false);
    }
  }

  connectReaderFnRef.current = connectToReader;

  async function cancelConnect() {
    if (updateInProgressRef.current) {
      setError(
        "Canceling now will interrupt the firmware update. Only cancel if you must; then Scan again and leave the app open for the full update.",
      );
    }
    expectDiscoverCancelRef.current = true;
    try {
      await cancelDiscovering();
    } catch {
      // ignore
    }
    try {
      await cancelInstallingUpdate();
    } catch {
      // ignore
    }
    updateInProgressRef.current = false;
    setUpdatingFirmware(false);
    connectInFlightRef.current = false;
    setBusy(false);
    setScanning(false);
    setStatus("Connect canceled. Tap Scan for M2 to try again.");
  }

  async function loadPosListings() {
    setListingsLoading(true);
    setListingsError(null);
    try {
      const res = await apiFetch(session, "/api/vendor/pos/listings");
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        listings?: {
          listingId: string;
          variantId: string | null;
          label: string;
          priceCents: number;
          listingType: string;
        }[];
      };
      if (!res.ok) {
        setListingsError(data.error || `Could not load listings (HTTP ${res.status}).`);
        setPosListings([]);
        return;
      }
      setPosListings(data.listings || []);
      if ((data.listings || []).length === 0 && data.hint) {
        setListingsError(data.hint);
      }
    } catch (e) {
      setListingsError(e instanceof Error ? e.message : "Could not load listings.");
      setPosListings([]);
    } finally {
      setListingsLoading(false);
    }
  }

  async function syncListingsFromStripe() {
    setListingsLoading(true);
    setListingsError(null);
    setStatus("Syncing products from Stripe into RootSync…");
    try {
      const res = await apiFetch(session, "/api/vendor/pos/sync-from-stripe", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        imported?: number;
        updated?: number;
      };
      if (!res.ok) {
        setListingsError(data.error || "Stripe sync failed.");
        setStatus("Sync failed.");
        return;
      }
      setStatus(data.message || "Synced from Stripe.");
      await loadPosListings();
    } catch (e) {
      setListingsError(e instanceof Error ? e.message : "Stripe sync failed.");
      setStatus("Sync failed.");
    } finally {
      setListingsLoading(false);
    }
  }

  useEffect(() => {
    if (!connectedReader) return;
    void loadPosListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedReader?.serialNumber, session.token]);

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await apiFetch(session, "/api/vendor/pos/orders?limit=25");
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        orders?: {
          id: string;
          status: string;
          totalCents: number;
          createdAt: string;
          itemLabel: string;
          items?: { name: string; quantity: number; priceCents: number }[];
          paymentIntentId?: string | null;
        }[];
        lastOrderId?: string | null;
      };
      if (!res.ok) {
        setError(data.error || "Could not load recent sales.");
        return;
      }
      const next = (data.orders || []).map((o) => ({
        ...o,
        items: o.items || [],
        paymentIntentId: o.paymentIntentId ?? null,
      }));
      setOrders(next);
      if (!selectedOrderId && data.lastOrderId) {
        setSelectedOrderId(data.lastOrderId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load recent sales.");
    } finally {
      setOrdersLoading(false);
    }
  }

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  function buildReceiptText(order: NonNullable<typeof selectedOrder>) {
    const when = new Date(order.createdAt).toLocaleString();
    const lines = (order.items.length
      ? order.items
      : [{ name: order.itemLabel, quantity: 1, priceCents: order.totalCents }]
    ).map((i) => {
      const amt = ((i.priceCents * i.quantity) / 100).toFixed(2);
      const qty = i.quantity > 1 ? ` x${i.quantity}` : "";
      return `${i.name}${qty}  $${amt}`;
    });
    return [
      session.displayName,
      "In-person sale (RootSync)",
      when,
      "----------------",
      ...lines,
      "----------------",
      `TOTAL  $${(order.totalCents / 100).toFixed(2)}`,
      `Order ${order.id}`,
      order.paymentIntentId ? `Payment ${order.paymentIntentId}` : null,
      "Thank you!",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function sendReceiptEmail() {
    if (!selectedOrderId) {
      setError("Select a sale first.");
      return;
    }
    if (!receiptEmail.trim()) {
      setError("Enter a customer email for the receipt.");
      return;
    }
    setReceiptBusy(true);
    setError(null);
    try {
      const res = await apiFetch(session, `/api/vendor/pos/orders/${selectedOrderId}/receipt`, {
        method: "POST",
        body: JSON.stringify({ channel: "email", email: receiptEmail.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not send receipt.");
        return;
      }
      setStatus(data.message || "Receipt sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send receipt.");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function sendReceiptSms() {
    if (!selectedOrderId) {
      setError("Select a sale first.");
      return;
    }
    if (!receiptPhone.trim()) {
      setError("Enter a mobile number for the SMS receipt.");
      return;
    }
    setReceiptBusy(true);
    setError(null);
    try {
      const res = await apiFetch(session, `/api/vendor/pos/orders/${selectedOrderId}/receipt`, {
        method: "POST",
        body: JSON.stringify({ channel: "sms", phone: receiptPhone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not send SMS receipt.");
        return;
      }
      setStatus(data.message || "SMS receipt sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send SMS receipt.");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function shareOrPrintReceipt() {
    if (!selectedOrder) {
      setError("Select a sale first.");
      return;
    }
    try {
      await Share.share({
        message: buildReceiptText(selectedOrder),
        title: `Receipt · ${session.displayName}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open share sheet.");
    }
  }

  async function charge(opts?: {
    listingId?: string;
    variantId?: string | null;
    amountCents?: number;
    description?: string;
  }) {
    if (!connectedReader) {
      setError("Connect the M2 first.");
      return;
    }

    const fromListing = Boolean(opts?.listingId);
    const chargeCents = fromListing
      ? opts?.amountCents ?? null
      : opts?.amountCents ?? amountCents;
    const chargeDescription = fromListing
      ? opts?.description
      : opts?.description ?? (description.trim() || undefined);

    if (!fromListing && (chargeCents == null || chargeCents < 50)) {
      setError("Enter at least $0.50, or tap a listing below.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Creating payment…");
    try {
      const intentRes = await apiFetch(session, "/api/vendor/pos/terminal-intent", {
        method: "POST",
        body: JSON.stringify(
          fromListing
            ? {
                listingId: opts!.listingId,
                variantId: opts!.variantId ?? undefined,
              }
            : {
                amountCents: chargeCents,
                description: chargeDescription,
              },
        ),
      });
      const intentData = (await intentRes.json().catch(() => ({}))) as {
        error?: string;
        clientSecret?: string;
        orderId?: string;
        amountCents?: number;
      };
      if (!intentRes.ok || !intentData.clientSecret) {
        setError(intentData.error || "Could not create PaymentIntent.");
        setStatus("Charge failed.");
        return;
      }

      const paidCents = intentData.amountCents ?? chargeCents ?? 0;
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
        `Paid $${(paidCents / 100).toFixed(2)} · order ${intentData.orderId || "ok"} · transfer to ${session.connectAccountId}`,
      );
      if (!fromListing) setDollars("");
      if (intentData.orderId) {
        setSelectedOrderId(intentData.orderId);
        setTab("sales");
      }
      void loadOrders();
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

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "charge" && styles.tabActive]}
          onPress={() => setTab("charge")}
        >
          <Text style={[styles.tabText, tab === "charge" && styles.tabTextActive]}>Charge</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "sales" && styles.tabActive]}
          onPress={() => {
            setTab("sales");
            void loadOrders();
          }}
        >
          <Text style={[styles.tabText, tab === "sales" && styles.tabTextActive]}>Sales</Text>
        </Pressable>
      </View>

      <Text style={styles.status}>{status}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {busy || receiptBusy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}

      {tab === "sales" ? (
        <>
          <Text style={styles.label}>Recent Terminal sales</Text>
          <Pressable
            style={styles.secondaryBtn}
            disabled={ordersLoading || receiptBusy}
            onPress={() => void loadOrders()}
          >
            <Text style={styles.secondaryBtnText}>
              {ordersLoading ? "Refreshing…" : "Refresh sales"}
            </Text>
          </Pressable>
          {orders.length === 0 && !ordersLoading ? (
            <Text style={styles.hint}>No in-person sales yet. Charge a card on the Charge tab.</Text>
          ) : null}
          {orders.map((o) => {
            const selected = o.id === selectedOrderId;
            const when = new Date(o.createdAt).toLocaleString();
            return (
              <Pressable
                key={o.id}
                style={[styles.orderRow, selected && styles.orderRowSelected]}
                onPress={() => setSelectedOrderId(o.id)}
              >
                <Text style={styles.orderTitle}>
                  ${(o.totalCents / 100).toFixed(2)} · {o.itemLabel}
                </Text>
                <Text style={styles.orderMeta}>
                  {o.status} · {when}
                </Text>
              </Pressable>
            );
          })}

          <Text style={[styles.label, { marginTop: 18 }]}>Receipt</Text>
          {!selectedOrder ? (
            <Text style={styles.hint}>Select a sale above to preview and send a receipt.</Text>
          ) : (
            <View style={styles.receiptCard}>
              <Text style={styles.receiptVendor}>{session.displayName}</Text>
              <Text style={styles.receiptMeta}>In-person sale · RootSync</Text>
              <Text style={styles.receiptMeta}>
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </Text>
              <View style={styles.receiptRule} />
              {(selectedOrder.items.length
                ? selectedOrder.items
                : [
                    {
                      name: selectedOrder.itemLabel,
                      quantity: 1,
                      priceCents: selectedOrder.totalCents,
                    },
                  ]
              ).map((line, idx) => (
                <View key={`${line.name}-${idx}`} style={styles.receiptLine}>
                  <Text style={styles.receiptLineName}>
                    {line.name}
                    {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                  </Text>
                  <Text style={styles.receiptLineAmt}>
                    ${((line.priceCents * line.quantity) / 100).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.receiptRule} />
              <View style={styles.receiptLine}>
                <Text style={styles.receiptTotal}>Total</Text>
                <Text style={styles.receiptTotal}>
                  ${(selectedOrder.totalCents / 100).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.receiptMeta}>Order {selectedOrder.id}</Text>
            </View>
          )}

          <Pressable
            style={styles.secondaryBtn}
            disabled={!selectedOrder || receiptBusy}
            onPress={() => void shareOrPrintReceipt()}
          >
            <Text style={styles.secondaryBtnText}>Share / Print receipt</Text>
          </Pressable>
          <Text style={styles.hint}>
            Opens the system share sheet — on iPhone choose Print (AirPrint) or Messages/Mail.
          </Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Email receipt</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={receiptEmail}
            onChangeText={setReceiptEmail}
            placeholder="customer@email.com"
          />
          <Pressable
            style={styles.btn}
            disabled={receiptBusy || !selectedOrderId}
            onPress={() => void sendReceiptEmail()}
          >
            <Text style={styles.btnText}>
              {receiptBusy ? "Sending…" : "Send receipt email"}
            </Text>
          </Pressable>

          <Text style={[styles.label, { marginTop: 14 }]}>SMS receipt</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={receiptPhone}
            onChangeText={setReceiptPhone}
            placeholder="(555) 123-4567"
          />
          <Pressable
            style={[styles.btn, { backgroundColor: "#1c1917" }]}
            disabled={receiptBusy || !selectedOrderId}
            onPress={() => void sendReceiptSms()}
          >
            <Text style={styles.btnText}>
              {receiptBusy ? "Sending…" : "Send receipt SMS"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
      <Text style={styles.hint}>
        First connect installs a required Stripe firmware update (often 5–15 minutes). Keep this app open, phone unlocked, and next to the M2 until the percentage hits 100%. Do not pair the M2 in iOS Settings → Bluetooth — if it is listed there, Forget This Device, then Scan only in this app.
      </Text>

      {!connectedReader ? (
        <>
          <Pressable
            style={styles.btn}
            disabled={!ready || scanning || busy}
            onPress={() => void scanReaders()}
          >
            <Text style={styles.btnText}>
              {scanning ? "Scanning…" : busy ? "Connecting…" : "Scan for M2"}
            </Text>
          </Pressable>
          {scanning ? (
            <Pressable
              style={styles.secondaryBtn}
              disabled={busy}
              onPress={() => void stopScan()}
            >
              <Text style={styles.secondaryBtnText}>Stop scan</Text>
            </Pressable>
          ) : null}
          {busy ? (
            <Pressable style={styles.secondaryBtn} onPress={() => void cancelConnect()}>
              <Text style={styles.secondaryBtnText}>
                {updatingFirmware
                  ? "Interrupt update (not recommended)"
                  : "Cancel connect"}
              </Text>
            </Pressable>
          ) : null}
          {(discovered || []).map((reader) => (
            <Pressable
              key={reader.serialNumber || String(reader.id)}
              style={[styles.btn, { marginTop: 10, backgroundColor: "#1c1917" }]}
              disabled={busy}
              onPress={() => void connectToReader(reader)}
            >
              <Text style={styles.btnText}>
                Connect {reader.deviceType} {reader.serialNumber}
              </Text>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.label}>Your ACTIVE listings</Text>
          <Text style={styles.hint}>
            These come from RootSync (not the Stripe Products tab). Products you create only in
            Stripe need Sync from Stripe once; items you publish as ACTIVE in Vendor → Listings
            appear after Refresh.
          </Text>
          <Pressable
            style={styles.secondaryBtn}
            disabled={busy || listingsLoading}
            onPress={() => void loadPosListings()}
          >
            <Text style={styles.secondaryBtnText}>
              {listingsLoading ? "Working…" : "Refresh listings"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            disabled={busy || listingsLoading}
            onPress={() => void syncListingsFromStripe()}
          >
            <Text style={styles.secondaryBtnText}>Sync from Stripe</Text>
          </Pressable>
          {listingsError ? <Text style={styles.error}>{listingsError}</Text> : null}
          {!listingsLoading && posListings.length === 0 && !listingsError ? (
            <Text style={styles.hint}>No ACTIVE RootSync listings at $0.50+ yet.</Text>
          ) : null}
          {posListings.map((item) => (
            <Pressable
              key={`${item.listingId}:${item.variantId || "base"}`}
              style={[styles.btn, { marginTop: 10, backgroundColor: "#1c1917" }]}
              disabled={busy}
              onPress={() =>
                void charge({
                  listingId: item.listingId,
                  variantId: item.variantId,
                  amountCents: item.priceCents,
                  description: item.label,
                })
              }
            >
              <Text style={styles.btnText}>
                ${(item.priceCents / 100).toFixed(2)} · {item.label}
              </Text>
            </Pressable>
          ))}

          <Text style={[styles.label, { marginTop: 22 }]}>Custom amount</Text>
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
            <Text style={styles.btnText}>{busy ? "Processing…" : "Charge custom amount"}</Text>
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
        </>
      )}

      <Pressable
        style={[styles.secondaryBtn, { marginTop: 24 }]}
        disabled={busy}
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

  const onLogout = useCallback(() => setSession(null), []);

  const tokenProvider = useCallback(async () => {
    const current = session || (await loadPosSession());
    if (!current) {
      throw new Error("Not signed in — open the app and log in again.");
    }
    const data = await fetchConnectionToken(current);
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
        <PosScreen session={session} onLogout={onLogout} />
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
  hint: { marginTop: 10, fontSize: 12, color: "#78716c", lineHeight: 18 },
  error: { marginTop: 10, color: "#b91c1c", fontSize: 13 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(28,25,23,0.2)",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#166534", borderColor: "#166534" },
  tabText: { fontWeight: "600", color: "#1c1917" },
  tabTextActive: { color: "#fff" },
  orderRow: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(28,25,23,0.12)",
    backgroundColor: "#fff",
  },
  orderRowSelected: {
    borderColor: "#166534",
    backgroundColor: "#ecfdf5",
  },
  orderTitle: { fontSize: 15, fontWeight: "600", color: "#1c1917" },
  orderMeta: { marginTop: 4, fontSize: 12, color: "#78716c" },
  receiptCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(28,25,23,0.12)",
  },
  receiptVendor: { fontSize: 18, fontWeight: "700", color: "#1c1917" },
  receiptMeta: { marginTop: 4, fontSize: 12, color: "#78716c" },
  receiptRule: {
    height: 1,
    backgroundColor: "rgba(28,25,23,0.12)",
    marginVertical: 12,
  },
  receiptLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  receiptLineName: { flex: 1, fontSize: 14, color: "#1c1917" },
  receiptLineAmt: { fontSize: 14, color: "#1c1917" },
  receiptTotal: { fontSize: 16, fontWeight: "700", color: "#1c1917" },
});
