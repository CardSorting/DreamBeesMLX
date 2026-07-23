package com.dreambees.android.ui

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.firebase.auth.AuthCredential
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

sealed interface AuthState {
    data object SplashLoading : AuthState
    data object Unauthenticated : AuthState
    data object Authenticating : AuthState
    data object Authenticated : AuthState
    data class Error(
        val message: String,
        val isDeveloperError: Boolean = false,
        val debugCode: Int? = null
    ) : AuthState
    data object Offline : AuthState
}

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private var _authState by mutableStateOf<AuthState>(AuthState.SplashLoading)
    var authState: AuthState
        get() = _authState
        private set(value) {
            android.util.Log.e("AuthViewModel", "authState changing from $_authState to $value")
            _authState = value
        }

    private val connectivityManager = application.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            viewModelScope.launch {
                if (authState is AuthState.Offline) {
                    checkInitialSession()
                }
            }
        }

        override fun onLost(network: Network) {
            viewModelScope.launch {
                if (authState is AuthState.Unauthenticated || authState is AuthState.Authenticating) {
                    authState = AuthState.Offline
                }
            }
        }
    }

    private val authListener = FirebaseAuth.AuthStateListener { firebaseAuth ->
        val currentUser = firebaseAuth.currentUser
        val isUserValid = currentUser != null && !currentUser.isAnonymous
        
        // Only override state reactively when we are not showing the initial brand splash
        if (authState != AuthState.SplashLoading) {
            authState = if (isUserValid) AuthState.Authenticated else AuthState.Unauthenticated
        }
    }

    init {
        FirebaseAuth.getInstance().addAuthStateListener(authListener)

        // Register dynamic network callback
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        try {
            connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        } catch (e: Exception) {
            android.util.Log.e("AuthViewModel", "Failed to register network callback", e)
        }

        // Check initial connectivity status
        if (!isNetworkAvailableInternal()) {
            authState = AuthState.Offline
        } else {
            checkInitialSession()
        }
    }

    override fun onCleared() {
        super.onCleared()
        FirebaseAuth.getInstance().removeAuthStateListener(authListener)
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            android.util.Log.e("AuthViewModel", "Failed to unregister network callback", e)
        }
    }

    private fun isNetworkAvailableInternal(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
        return when {
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
            else -> false
        }
    }

    fun checkInitialSession() {
        if (!isNetworkAvailableInternal()) {
            authState = AuthState.Offline
            return
        }

        authState = AuthState.SplashLoading
        viewModelScope.launch {
            // Keep splash on screen for a minimum duration to avoid flickering
            delay(2000)
            val firebaseAuth = FirebaseAuth.getInstance()
            val currentUser = firebaseAuth.currentUser
            
            if (currentUser != null && !currentUser.isAnonymous) {
                authState = AuthState.Authenticated
            } else {
                authState = AuthState.Unauthenticated
            }
        }
    }

    fun isGooglePlayServicesAvailable(context: Context): Boolean {
        val availability = GoogleApiAvailability.getInstance()
        val resultCode = availability.isGooglePlayServicesAvailable(context)
        return resultCode == ConnectionResult.SUCCESS
    }

    fun startAuthenticating() {
        authState = AuthState.Authenticating
    }

    fun handleSignInSuccess(credential: AuthCredential) {
        authState = AuthState.Authenticating
        FirebaseAuth.getInstance().signInWithCredential(credential)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    authState = AuthState.Authenticated
                } else {
                    val ex = task.exception
                    val msg = ex?.localizedMessage ?: "Firebase Authentication failed"
                    authState = AuthState.Error(
                        message = msg,
                        isDeveloperError = ex?.message?.contains("developer", ignoreCase = true) == true
                    )
                }
            }
    }

    fun handleSignInFailure(exception: Exception) {
        android.util.Log.e("AuthViewModel", "handleSignInFailure: exception class=${exception::class.java.name}, message=${exception.message}", exception)
        val statusCode = (exception as? com.google.android.gms.common.api.ApiException)?.statusCode
        android.util.Log.e("AuthViewModel", "handleSignInFailure: statusCode=$statusCode")
        
        when (statusCode) {
            12501 -> {
                // Sign-In cancelled by user
                authState = AuthState.Unauthenticated
            }
            10 -> {
                // DEVELOPER_ERROR — almost always SHA-1 mismatch
                authState = AuthState.Error(
                    message = "Configuration Issue (Code 10): The SHA-1 fingerprint of your signing certificate is not registered in the Firebase console. Please register your debug SHA-1 signature key.",
                    isDeveloperError = true,
                    debugCode = 10
                )
            }
            7 -> {
                // NETWORK_ERROR
                authState = AuthState.Offline
            }
            else -> {
                authState = AuthState.Error(
                    message = exception.localizedMessage ?: "Google Sign-In failed",
                    isDeveloperError = false,
                    debugCode = statusCode
                )
            }
        }
    }

    fun resetToUnauthenticated() {
        authState = AuthState.Unauthenticated
    }
}
