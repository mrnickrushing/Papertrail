import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAppStore, useProStore, useTourStore } from '@/store';
import {
  getAdminProfileDefaults,
  isAdminBypassConfigured,
  validateAdminBypassCode,
} from '@/services/adminAccess';
import { C, R, S, T } from '@/theme/tokens';
import { hashPassword, verifyPassword, registerUserWithBackend, loginUserWithBackend } from '@/services/userService';
import { createHash } from '@/services/hashUtils';
import {
  getStoredPasswordHash,
  setStoredPasswordHash,
} from '@/services/secureCredentials';

type AuthMode = 'create' | 'login';
type BusyAction = 'manual' | 'apple' | null;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function appleFullName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined,
): string {
  const parts = [fullName?.givenName, fullName?.middleName, fullName?.familyName]
    .filter(Boolean)
    .map((part) => part!.trim());
  return parts.join(' ').trim();
}

async function appleRelayFallbackHashed(userId: string): Promise<string> {
  // Apple's `credential.user` is an opaque, app-scoped, stable identifier.
  // Hash it so collisions are vanishingly unlikely and so the raw ID never
  // ends up in plaintext as a synthetic email address.
  const digest = await createHash(userId);
  return `apple-${digest.slice(0, 24)}@private.filetrail`;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const accountProfile = useAppStore((s) => s.accountProfile);
  const isAccountAuthenticated = useAppStore((s) => s.isAccountAuthenticated);
  const completeAccountSetup = useAppStore((s) => s.completeAccountSetup);
  const setAccountAuthenticated = useAppStore((s) => s.setAccountAuthenticated);
  const hasAdminAccess = useProStore((s) => s.hasAdminAccess);
  const setAdminAccess = useProStore((s) => s.setAdminAccess);
  const startTour = useTourStore((s) => s.startTour);

  const [mode, setMode] = useState<AuthMode>(accountProfile ? 'login' : 'create');
  const [fullName, setFullName] = useState(accountProfile?.fullName ?? '');
  const [email, setEmail] = useState(accountProfile?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ownerCode, setOwnerCode] = useState('');
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [storedPasswordHash, setLocalPasswordHash] = useState<string | null>(null);
  const isMounted = React.useRef(true);
  React.useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  const ownerAccessConfigured = isAdminBypassConfigured();
  const adminDefaults = getAdminProfileDefaults();

  // One-time migration: older builds stored the password hash on
  // accountProfile (persisted to AsyncStorage as plain JSON). Move any
  // leftover value into expo-secure-store and strip it from the profile.
  const hasCheckedCredentials = React.useRef(false);
  useEffect(() => {
    if (hasCheckedCredentials.current) return;
    hasCheckedCredentials.current = true;

    let cancelled = false;
    (async () => {
      const legacyHash = accountProfile?.passwordHash;
      if (legacyHash) {
        try {
          await setStoredPasswordHash(legacyHash);
          useAppStore.setState((state) => (
            state.accountProfile
              ? { accountProfile: { ...state.accountProfile, passwordHash: undefined } }
              : {}
          ));
        } catch {
          // Migration failed — leave the legacy hash in place; it'll still
          // work for verification and we can retry next launch.
        }
      }
      const hash = legacyHash ?? (await getStoredPasswordHash());
      if (!cancelled) setLocalPasswordHash(hash ?? null);
    })();

    return () => { cancelled = true; };
  }, [accountProfile]);

  useEffect(() => {
    let active = true;

    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return () => {
        active = false;
      };
    }

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (active) setAppleAvailable(available);
      })
      .catch(() => {
        if (active) setAppleAvailable(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accountProfile) return;
    setMode('login');
    setEmail(accountProfile.email);
    setFullName(accountProfile.fullName);
  }, [accountProfile]);

  const isCreateMode = mode === 'create';
  const headerTitle = isCreateMode ? 'Create your FileTrail account' : 'Welcome back';
  const headerBody = isCreateMode
    ? 'Set up your local vault profile before you enter the app. You can continue with Apple or create it manually.'
    : 'Sign back into the local FileTrail profile saved on this device.';
  const manualButtonLabel = isCreateMode ? 'Create account' : 'Log in';
  const isWorking = busyAction !== null;
  const featurePills = useMemo(
    () => ['Private by default', 'AI-ready filing', 'Works with backups'],
    [],
  );

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (isAccountAuthenticated) {
    return <Redirect href="/(tabs)/" />;
  }

  function fail(message: string) {
    setError(message);
  }

  function clearInlineError() {
    if (error) setError(null);
  }

  function clearOwnerError() {
    if (ownerError) setOwnerError(null);
  }

  async function createManualProfile() {
    const trimmedName = fullName.trim();
    const normalizedEmail = normalizeEmail(email);

    if (accountProfile) {
      setMode('login');
      fail('A local FileTrail account already exists on this device. Log in instead.');
      return;
    }

    if (!trimmedName) {
      fail('Enter your name to finish setup.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      fail('Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      fail('Password must be at least 8 characters.');
      return;
    }

    const pwHash = await hashPassword(password);
    await setStoredPasswordHash(pwHash);
    setLocalPasswordHash(pwHash);
    const newProfile = {
      fullName: trimmedName,
      email: normalizedEmail,
      provider: 'email' as const,
      createdAt: new Date().toISOString(),
    };
    startTour();

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const regResult = await registerUserWithBackend({
      id,
      fullName: trimmedName,
      email: normalizedEmail,
      passwordHash: pwHash,
      provider: 'email',
    });
    // Persist the server-assigned userId so backend sync can reference it later.
    completeAccountSetup({
      ...newProfile,
      userId: regResult.userId,
      storageAccessToken: regResult.storageAccessToken,
    });
  }

  async function loginWithManualProfile() {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      fail('Enter the email address attached to this FileTrail account.');
      return;
    }

    if (accountProfile?.provider === 'apple') {
      fail('This account uses Apple sign in. Continue with Apple below.');
      return;
    }

    const existingHash = accountProfile ? await getStoredPasswordHash() : null;
    if (existingHash && accountProfile) {
      if (normalizeEmail(accountProfile.email) !== normalizedEmail) {
        fail('That email does not match the FileTrail account stored on this device.');
        return;
      }
      const { ok, needsRehash } = await verifyPassword(password, existingHash);
      if (!ok) {
        fail('That password does not match this FileTrail account.');
        return;
      }
      if (needsRehash) {
        // Legacy unsalted SHA-256 → upgrade to PBKDF2-style hash transparently.
        try {
          const upgraded = await hashPassword(password);
          await setStoredPasswordHash(upgraded);
          setLocalPasswordHash(upgraded);
        } catch {
          // Non-fatal: keep the existing hash, user can still log in.
        }
      }
    }

    const backendHash = await hashPassword(password);
    const backendLogin = await loginUserWithBackend({
      email: normalizedEmail,
      passwordHash: backendHash,
    });

    if (!backendLogin.ok || !backendLogin.userId || !backendLogin.storageAccessToken) {
      fail('Could not reconnect this account to the backend. Check your email and password, then try again.');
      return;
    }

    completeAccountSetup({
      fullName: backendLogin.fullName ?? accountProfile?.fullName ?? 'FileTrail User',
      email: backendLogin.email ?? normalizedEmail,
      provider: 'email',
      createdAt: backendLogin.createdAt ?? accountProfile?.createdAt ?? new Date().toISOString(),
      userId: backendLogin.userId,
      storageAccessToken: backendLogin.storageAccessToken,
    });
  }

  async function handleManualSubmit() {
    clearInlineError();
    setBusyAction('manual');
    try {
      if (isCreateMode) {
        await createManualProfile();
      } else {
        await loginWithManualProfile();
      }
    } finally {
      if (isMounted.current) setBusyAction(null);
    }
  }

  function resolveOwnerProfile(): { fullName: string; email: string } | null {
    const trimmedName = fullName.trim() || adminDefaults.fullName;
    const normalizedEmail = normalizeEmail(email || adminDefaults.email || '');

    if (!trimmedName) {
      setOwnerError('Enter a name or set EXPO_PUBLIC_ADMIN_NAME for the owner profile.');
      return null;
    }

    if (!isValidEmail(normalizedEmail)) {
      setOwnerError('Enter a valid owner email or set EXPO_PUBLIC_ADMIN_EMAIL.');
      return null;
    }

    return { fullName: trimmedName, email: normalizedEmail };
  }

  function handleOwnerAccess() {
    clearInlineError();
    clearOwnerError();

    if (!validateAdminBypassCode(ownerCode)) {
      setOwnerError('Owner code did not match the configured admin secret.');
      return;
    }

    if (accountProfile) {
      setAdminAccess(true);
      setAccountAuthenticated(true);
      setOwnerCode('');
      return;
    }

    const ownerProfile = resolveOwnerProfile();
    if (!ownerProfile) return;

    completeAccountSetup({
      fullName: ownerProfile.fullName,
      email: ownerProfile.email,
      provider: 'email',
      createdAt: new Date().toISOString(),
    });
    setAdminAccess(true);
    startTour();
    setOwnerCode('');
  }

  async function handleAppleAuth() {
    clearInlineError();

    if (!appleAvailable) {
      Alert.alert(
        'Apple Sign In Unavailable',
        'Sign in with Apple is only available on supported iPhone and iPad builds.',
      );
      return;
    }

    setBusyAction('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const credentialName = appleFullName(credential.fullName);
      const fallbackEmail = await appleRelayFallbackHashed(credential.user);
      const normalizedEmail = normalizeEmail(
        credential.email ?? email ?? accountProfile?.email ?? fallbackEmail,
      );

      if (isCreateMode) {
        if (accountProfile) {
          setMode('login');
          fail('A local FileTrail account already exists on this device. Log in instead.');
          return;
        }

        const appleProfile = {
          fullName: credentialName || fullName.trim() || 'FileTrail User',
          email: normalizedEmail,
          provider: 'apple' as const,
          appleUserId: credential.user,
          createdAt: new Date().toISOString(),
        };
        startTour();
        // Register Apple user on backend (fire-and-forget — local auth already set)
        const appleId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        const appleResult = await registerUserWithBackend({
          id: appleId,
          fullName: appleProfile.fullName,
          email: appleProfile.email,
          passwordHash: '',
          provider: 'apple',
          appleUserId: credential.user,
        });
        completeAccountSetup({
          ...appleProfile,
          userId: appleResult.userId,
          storageAccessToken: appleResult.storageAccessToken,
        });
        return;
      }

      if (!accountProfile) {
        setMode('create');
        fail('No local account exists on this device yet. Create one first.');
        return;
      }

      const sameAppleUser = Boolean(
        accountProfile.appleUserId && accountProfile.appleUserId === credential.user,
      );
      const sameEmail = normalizeEmail(accountProfile.email) === normalizedEmail;

      if (!sameAppleUser && !sameEmail) {
        fail('This Apple ID does not match the FileTrail account stored on this device.');
        return;
      }

      if (!accountProfile.userId || !accountProfile.storageAccessToken) {
        const appleResult = await registerUserWithBackend({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
          fullName: accountProfile.fullName,
          email: accountProfile.email,
          passwordHash: '',
          provider: 'apple',
          appleUserId: credential.user,
        });
        if (appleResult.userId && appleResult.storageAccessToken) {
          completeAccountSetup({
            ...accountProfile,
            userId: appleResult.userId,
            storageAccessToken: appleResult.storageAccessToken,
          });
          return;
        }
      }

      setAccountAuthenticated(true);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }

      Alert.alert(
        'Apple Sign In Failed',
        err instanceof Error ? err.message : 'Try again in a moment.',
      );
    } finally {
      if (isMounted.current) setBusyAction(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + S[8], paddingBottom: Math.max(insets.bottom, S[8]) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LOCAL VAULT SETUP</Text>
          </View>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.body}>{headerBody}</Text>
          <View style={styles.pills}>
            {featurePills.map((pill) => (
              <View key={pill} style={styles.pill}>
                <Text style={styles.pillText}>{pill}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.segmented}>
          <Pressable
            style={[styles.segmentBtn, isCreateMode && styles.segmentBtnActive]}
            onPress={() => {
              clearInlineError();
              setMode('create');
            }}
          >
            <Text style={[styles.segmentText, isCreateMode && styles.segmentTextActive]}>
              Create account
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, !isCreateMode && styles.segmentBtnActive]}
            onPress={() => {
              clearInlineError();
              setMode('login');
            }}
          >
            <Text style={[styles.segmentText, !isCreateMode && styles.segmentTextActive]}>
              Log in
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {isCreateMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  clearInlineError();
                }}
                placeholder="Casey Morgan"
                placeholderTextColor={C.ash}
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
                textContentType="name"
                editable={!isWorking}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{isCreateMode ? 'Email' : 'Account email'}</Text>
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearInlineError();
              }}
              placeholder="you@papertrail.app"
              placeholderTextColor={C.ash}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              textContentType="emailAddress"
              editable={!isWorking}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearInlineError();
              }}
              placeholder={isCreateMode ? 'Create a password' : 'Enter your password'}
              placeholderTextColor={C.ash}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
              textContentType={isCreateMode ? 'newPassword' : 'password'}
              editable={!isWorking}
            />
            {!isCreateMode && accountProfile?.provider === 'email' && !storedPasswordHash && (
              <Text style={styles.fieldHint}>
                This device has an older local account profile. Email-only login still works.
              </Text>
            )}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || isWorking) && styles.primaryBtnPressed,
            ]}
            onPress={handleManualSubmit}
            disabled={isWorking}
          >
            {busyAction === 'manual' ? (
              <ActivityIndicator color={C.ink1} />
            ) : (
              <Text style={styles.primaryBtnText}>{manualButtonLabel}</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                isCreateMode
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={R.lg}
              style={styles.appleButton}
              onPress={handleAppleAuth}
            />
          ) : (
            <View style={styles.appleUnavailable}>
              <Text style={styles.appleUnavailableTitle}>Apple sign in appears on iPhone builds</Text>
              <Text style={styles.appleUnavailableBody}>
                This project is wired for Sign in with Apple. Run the iOS build to use it.
              </Text>
            </View>
          )}
        </View>

        {ownerAccessConfigured && (
          <View style={styles.ownerCard}>
            <View style={styles.ownerHeader}>
              <Text style={styles.ownerTitle}>Owner access</Text>
              {hasAdminAccess && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.ownerBody}>
              Use your owner code here to create your local admin account or unlock the existing one.
            </Text>
            {adminDefaults.email && !accountProfile && (
              <Text style={styles.ownerHint}>
                Default owner email: {adminDefaults.email}
              </Text>
            )}
            <TextInput
              value={ownerCode}
              onChangeText={(value) => {
                setOwnerCode(value);
                clearOwnerError();
              }}
              placeholder="Owner access code"
              placeholderTextColor={C.ash}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.ownerInput}
              editable={!isWorking}
            />
            {ownerError && <Text style={styles.ownerError}>{ownerError}</Text>}
            <Pressable
              style={({ pressed }) => [
                styles.ownerBtn,
                (pressed || isWorking || ownerCode.trim().length === 0) && styles.ownerBtnPressed,
              ]}
              onPress={handleOwnerAccess}
              disabled={isWorking || ownerCode.trim().length === 0}
            >
              <Text style={styles.ownerBtnText}>
                {accountProfile ? 'Unlock owner account' : 'Create owner account'}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.footer}>
          {accountProfile
            ? 'This device already has a FileTrail profile. Log in to keep using the same vault.'
            : 'Your account profile is stored on this device today. Vault files remain local unless you explicitly back them up or share them.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: C.ink1,
  },
  container: {
    flex: 1,
    backgroundColor: C.ink1,
  },
  content: {
    paddingHorizontal: S[6],
    gap: S[6],
  },
  hero: {
    gap: S[4],
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: 6,
    backgroundColor: C.amberDim,
    borderWidth: 1,
    borderColor: `${C.amber}33`,
  },
  badgeText: {
    fontSize: T.xs,
    fontWeight: '700',
    color: C.amber,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: C.cream,
  },
  body: {
    fontSize: T.base,
    lineHeight: 24,
    color: C.ash,
    maxWidth: 340,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  pill: {
    borderRadius: R.full,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink4,
  },
  pillText: {
    color: C.cream,
    fontSize: T.sm,
    fontWeight: '500',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: R.full,
    backgroundColor: C.ink2,
    borderWidth: 1,
    borderColor: C.ink4,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: C.amberDim,
  },
  segmentText: {
    fontSize: T.sm,
    color: C.ash,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: C.amber,
  },
  form: {
    backgroundColor: C.ink2,
    borderRadius: R.xl,
    padding: S[5],
    borderWidth: 1,
    borderColor: C.ink4,
    gap: S[4],
  },
  fieldGroup: {
    gap: S[2],
  },
  label: {
    color: C.cream,
    fontSize: T.sm,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink4,
    backgroundColor: C.ink3,
    paddingHorizontal: S[4],
    color: C.cream,
    fontSize: T.base,
  },
  errorText: {
    color: C.danger,
    fontSize: T.sm,
    lineHeight: 20,
  },
  fieldHint: {
    color: C.ash,
    fontSize: T.xs,
    lineHeight: 18,
  },
  primaryBtn: {
    minHeight: 54,
    borderRadius: R.lg,
    backgroundColor: C.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S[1],
  },
  primaryBtnPressed: {
    opacity: 0.82,
  },
  primaryBtnText: {
    color: C.ink1,
    fontSize: T.base,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: C.ink4,
  },
  dividerText: {
    color: C.ash,
    fontSize: T.sm,
    fontWeight: '600',
  },
  appleButton: {
    width: '100%',
    height: 54,
  },
  appleUnavailable: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink4,
    backgroundColor: C.ink3,
    padding: S[4],
    gap: S[2],
  },
  appleUnavailableTitle: {
    color: C.cream,
    fontSize: T.sm,
    fontWeight: '600',
  },
  appleUnavailableBody: {
    color: C.ash,
    fontSize: T.sm,
    lineHeight: 20,
  },
  ownerCard: {
    backgroundColor: C.ink2,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: `${C.amber}33`,
    padding: S[5],
    gap: S[3],
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S[3],
  },
  ownerTitle: {
    color: C.cream,
    fontSize: T.base,
    fontWeight: '700',
  },
  ownerBadge: {
    borderRadius: R.full,
    backgroundColor: C.amberDim,
    borderWidth: 1,
    borderColor: `${C.amber}44`,
    paddingHorizontal: S[3],
    paddingVertical: 6,
  },
  ownerBadgeText: {
    color: C.amber,
    fontSize: T.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  ownerBody: {
    color: C.ash,
    fontSize: T.sm,
    lineHeight: 20,
  },
  ownerHint: {
    color: C.amber,
    fontSize: T.xs,
    lineHeight: 18,
  },
  ownerInput: {
    minHeight: 48,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.ink4,
    backgroundColor: C.ink3,
    paddingHorizontal: S[4],
    color: C.cream,
    fontSize: T.base,
  },
  ownerError: {
    color: C.danger,
    fontSize: T.xs,
    lineHeight: 18,
  },
  ownerBtn: {
    minHeight: 48,
    borderRadius: R.lg,
    backgroundColor: C.amberDim,
    borderWidth: 1,
    borderColor: `${C.amber}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBtnPressed: {
    opacity: 0.72,
  },
  ownerBtnText: {
    color: C.amber,
    fontSize: T.sm,
    fontWeight: '700',
  },
  footer: {
    color: C.ash,
    fontSize: T.sm,
    lineHeight: 20,
  },
});
