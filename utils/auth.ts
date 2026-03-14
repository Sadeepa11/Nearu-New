import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const API_BASE_URL = "https://api.medi.lk/api";

// export const API_BASE_URL = "https://nearu.servefamily.com/api";

// export const API_BASE_URL = "https://nearu.kalametiyaseafoodrestaurant.com/api";

// export const API_BASE_URL = "https://nearu.kalametiyaseafoodrestaurant.com/api";






/**
 * Logs out the user by calling the logout API endpoint, clearing all stored tokens and user data,
 * and signing out of Google if applicable.
 */
export const logout = async (): Promise<void> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");

    // Call the logout API endpoint if we have a refresh token
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            refreshToken: refreshToken,
          }),
        });
      } catch (apiError) {
        // Continue with token clearing even if API call fails
        console.error("Error calling logout API:", apiError);
      }
    }

    // Google Sign Out
    try {
      await GoogleSignin.signOut();
    } catch (googleError) {
      // Ignore if not signed in or other google errors, proceed to clear local storage
      console.log("Google sign out error (ignorable):", googleError);
    }

    // Clear tokens and user data regardless of API call success/failure
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("user");

  } catch (error) {
    console.error("Error during logout:", error);
    // Still try to clear tokens and user even if there's an error
    try {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("refreshToken");
      await AsyncStorage.removeItem("user");
    } catch (clearError) {
      console.error("Error clearing local storage:", clearError);
    }
  }
};

const REQUEST_MIN_INTERVAL_MS = 1000;
const inFlightRequests = new Map<string, Promise<Response>>();
const lastRequestTimestamps = new Map<string, number>();

type EnhancedRequestInit = RequestInit & {
  skipThrottle?: boolean;
  throttleKey?: string;
  minIntervalMs?: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const executeThrottledRequest = async (
  throttleKey: string,
  interval: number,
  requestFactory: () => Promise<Response>
): Promise<Response> => {
  const existingInFlight = inFlightRequests.get(throttleKey);

  if (existingInFlight) {
    try {
      await existingInFlight;
    } catch (error) {
      console.warn("Previous request failed for", throttleKey, error);
    }
  }

  const lastTimestamp = lastRequestTimestamps.get(throttleKey);
  if (lastTimestamp) {
    const elapsed = Date.now() - lastTimestamp;
    if (elapsed < interval) {
      await sleep(interval - elapsed);
    }
  }

  const inFlightPromise = (async () => {
    try {
      return await requestFactory();
    } finally {
      lastRequestTimestamps.set(throttleKey, Date.now());
      inFlightRequests.delete(throttleKey);
    }
  })();

  inFlightRequests.set(throttleKey, inFlightPromise);
  return inFlightPromise;
};

// Token refresh lock to prevent concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;
let isRefreshing = false;

/**
 * Refreshes the access token using the stored refresh token
 * Uses a lock mechanism to prevent concurrent refresh attempts
 * @returns The new access token or null if refresh fails
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  // If a refresh is already in progress, wait for it to complete
  if (isRefreshing && refreshPromise) {
    console.log("Token refresh already in progress, waiting...");
    return refreshPromise;
  }

  // Start a new refresh
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");

      if (!refreshToken) {
        console.warn("No refresh token found");
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Store the new access token
        await AsyncStorage.setItem("authToken", data.token);

        // Store the new refresh token if provided
        if (data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", data.refreshToken);
        }

        console.log("Token refreshed successfully");
        return data.token;
      } else {
        console.error("Token refresh failed:", data);

        // If refresh fails, clear tokens
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("refreshToken");

        return null;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);

      // Clear tokens on error
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("refreshToken");

      return null;
    } finally {
      // Reset the lock
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Gets the current access token, refreshing it if needed
 * @returns The access token or null if unavailable
 */
export const getAccessToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem("authToken");
  return token;
};

/**
 * Checks if user is authenticated (has both access and refresh tokens)
 * @returns true if both tokens exist, false otherwise
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const accessToken = await AsyncStorage.getItem("authToken");
  const refreshToken = await AsyncStorage.getItem("refreshToken");
  return !!(accessToken && refreshToken);
};

/**
 * Makes an authenticated API request with automatic token refresh on 401 errors
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param retryAttempt - Internal parameter to track retry attempts
 * @returns The fetch response
 */
export const authenticatedFetch = async (
  url: string,
  options: EnhancedRequestInit = {},
  retryAttempt: number = 0
): Promise<Response> => {
  const MAX_RETRIES = 1;
  const { skipThrottle = false, throttleKey, minIntervalMs, ...fetchOptions } =
    options;

  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const shouldThrottle = !skipThrottle && method === "GET";
  const throttleKeyToUse = throttleKey ?? `${method}:${url}`;
  const effectiveInterval = minIntervalMs ?? REQUEST_MIN_INTERVAL_MS;

  const performRequest = async (authToken?: string | null) => {
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> | undefined),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };

    return fetch(url, {
      ...fetchOptions,
      headers,
    });
  };

  // Get the current access token
  let token = await getAccessToken();

  const response = shouldThrottle
    ? await executeThrottledRequest(throttleKeyToUse, effectiveInterval, () =>
      performRequest(token)
    )
    : await performRequest(token);

  // If we get a 401 (Unauthorized), try to refresh the token and retry
  if (response.status === 401 && retryAttempt < MAX_RETRIES) {
    console.log("Token expired, attempting refresh...");

    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the request with the new token. Skip throttling to avoid extra delay.
      return authenticatedFetch(
        url,
        {
          ...fetchOptions,
          skipThrottle: true,
          throttleKey: throttleKeyToUse,
          minIntervalMs: effectiveInterval,
        },
        retryAttempt + 1
      );
    } else {
      // Refresh failed, return the original response
      return response;
    }
  }

  return response;
};



/**
 * Authenticates the user with Google using the provided ID token
 * @param idToken - The Google ID token obtained from Google Sign-In
 * @returns The fetch response
 */
export const loginWithGoogle = async (idToken: string): Promise<Response> => {
  return fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      idToken: idToken,
    }),
  });
};


/**
 * Stores the authentication tokens in AsyncStorage
 * @param accessToken - The access token
 * @param refreshToken - The refresh token (optional)
 */
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
  await AsyncStorage.setItem("authToken", accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem("refreshToken", refreshToken);
  }
};

// --- Phone Auth APIs ---

/**
 * Sends an OTP to the provided phone number.
 * @param phoneNumber The phone number to verify
 * @param name Optional name for registration
 */
export const sendPhoneOtp = async (phoneNumber: string, name?: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/phone/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      phoneNumber,
      name,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send OTP");
  }
  return data;
};

/**
 * Verifies the OTP and registers or logs in the user.
 * @param phoneNumber The phone number to verify
 * @param code The OTP code
 * @param name Optional name for registration
 */
export const verifyPhoneOtp = async (phoneNumber: string, code: string, name?: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/phone/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      phoneNumber,
      code,
      name,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify OTP");
  }
  return data;
};

/**
 * Resends the OTP to the provided phone number.
 * @param phoneNumber The phone number
 */
export const resendPhoneOtp = async (phoneNumber: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/phone/resend-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      phoneNumber,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to resend OTP");
  }
  return data;
};

// --- Email Auth APIs ---

/**
 * Sends/Resends an email verification code.
 * @param email The email address to verify
 */
export const sendEmailVerification = async (email: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/resend-email-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send email verification code");
  }
  return data;
};

/**
 * Verifies the email with the provided code.
 * @param email The email address
 * @param code The verification code
 */
export const verifyEmail = async (email: string, code: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      email,
      code,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify email");
  }
  return data;
};

// --- Profile Update API ---

/**
 * Updates the user's profile including name, metadata, and profile image.
 * Uses multipart/form-data for image uploads.
 * @param params Object containing name, metadata, and profileImage
 */
export const updateUserProfile = async (params: {
  name?: string;
  metadata?: Record<string, any>;
  profileImage?: { uri: string; name: string; type: string };
  email?: string;
  phoneNumber?: string;
}): Promise<any> => {
  const formData = new FormData();

  if (params.name) {
    formData.append("name", params.name);
  }

  if (params.email) {
    formData.append("email", params.email);
  }

  if (params.phoneNumber) {
    formData.append("phoneNumber", params.phoneNumber);
  }

  if (params.metadata) {
    formData.append("metadata", JSON.stringify(params.metadata));
  }

  if (params.profileImage) {
    formData.append("profileImage", {
      uri: params.profileImage.uri,
      name: params.profileImage.name,
      type: params.profileImage.type,
    } as any);
  }

  // Get current token for authorization
  const token = await getAccessToken();
  if (!token) {
    throw new Error("No access token found");
  }

  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "PUT",
    headers: {
      // Content-Type for multipart/form-data is set automatically by fetch when Body is FormData
      // We just need the Authorization header
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }
  return data;
};

/**
 * Deletes the user's account/profile.
 */
export const deleteUserProfile = async (): Promise<any> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("No access token found");
  }

  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete account");
  }
  return data;
};
