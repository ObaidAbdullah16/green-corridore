import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapView } from './components/Map/MapView';
import { Header } from './components/Common/Header';
import { AlertToast } from './components/Common/AlertToast';
import { ModernNavDrawer } from './components/Navigation/ModernNavDrawer';
import { TurnByTurnPanel } from './components/Navigation/TurnByTurnPanel';
import { ActiveNavOverlay } from './components/Navigation/ActiveNavOverlay';
import { ReportHazardModal } from './components/Hazards/ReportHazardModal';
import { HazardDetailsModal } from './components/Hazards/HazardDetailsModal';
import { HazardsListModal } from './components/Hazards/HazardsListModal';
import { HazardLegend } from './components/Hazards/HazardLegend';
import { AuthorityLoginModal } from './components/Hazards/AuthorityLoginModal';
import { AuthorityPanel } from './components/Hazards/AuthorityPanel';
import { fetchRoute, fetchHazards, getApiRole, setApiRole } from './services/api';
import { useSocket } from './hooks/useSocket';
import { useGeolocation } from './hooks/useGeolocation';

// Default Origin: IET DAVV Indore
const DEFAULT_ORIGIN = {
  id: 'iet_davv',
  name: 'IET DAVV, Khandwa Road',
  displayName: 'Institute of Engineering & Technology, DAVV Campus, Khandwa Road, Indore',
  lat: 22.6812,
  lon: 75.8796
};

export default function App() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [hazards, setHazards] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Modern UI Theme ('dark' | 'light') and Travel Mode ('car' | 'bike' | 'walk')
  const [theme, setTheme] = useState('dark');
  const [travelMode, setTravelMode] = useState('car');

  // Role-Based Access Control State: 'citizen' or 'authority'
  const [userRole, setUserRole] = useState(getApiRole());
  const [isAuthorityLoginOpen, setIsAuthorityLoginOpen] = useState(false);
  const [isAuthorityPanelOpen, setIsAuthorityPanelOpen] = useState(false);

  // Hazards Feed & Detail Inspection Modals
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [isHazardsListOpen, setIsHazardsListOpen] = useState(false);
  const [focusLocation, setFocusLocation] = useState(null);

  // Hazard reporting modal state
  const [reportModalCoords, setReportModalCoords] = useState(null);
  const [isPickingHazardLocation, setIsPickingHazardLocation] = useState(false);

  // Alert toast
  const [alert, setAlert] = useState(null);

  // Calculate route between current origin and destination
  const calculateRoute = useCallback(async (startPoint, endPoint, alertOnSuccess = false) => {
    if (!startPoint || !endPoint) {
      setRoute(null);
      return null;
    }

    setIsLoadingRoute(true);
    try {
      const data = await fetchRoute(
        [startPoint.lat, startPoint.lon],
        [endPoint.lat, endPoint.lon]
      );
      setRoute(data);

      if (alertOnSuccess) {
        setAlert({
          type: 'success',
          title: 'Route Updated',
          message: `Calculated hazard-aware route (${(data.distance / 1000).toFixed(1)} km, ${Math.round(data.duration / 60)} min).`
        });
      }
      return data;
    } catch (err) {
      console.error('Route calculation error:', err);
      setAlert({
        type: 'danger',
        title: 'Routing Error',
        message: err.message || 'Could not find a valid road route.'
      });
      setRoute(null);
      return null;
    } finally {
      setIsLoadingRoute(false);
    }
  }, []);

  // Handle off-route recalculation from GPS position
  const handleOffRoute = useCallback((currentCoords) => {
    if (!destination) return;
    console.log('User deviated from planned route. Recalculating from:', currentCoords);
    setAlert({
      type: 'warning',
      title: 'Off Route Recalculation',
      message: 'You have left the planned route. Recalculating path to destination...'
    });

    const newStart = {
      name: 'Current Location',
      lat: currentCoords[0],
      lon: currentCoords[1]
    };
    setOrigin(newStart);
    calculateRoute(newStart, destination);
  }, [destination, calculateRoute]);

  // Geolocation hook
  const {
    location: userLocation,
    heading,
    speed,
    permissionState,
    isSimulating,
    isRerouting,
    progressPercent,
    seekSimulation,
    startWatching,
    stopWatching,
    startSimulation,
    updateSimulationRoute,
    setManualPosition
  } = useGeolocation({
    onLocationUpdate: (coords) => {
      // Sync location to backend if actively navigating
      if (isNavigating) {
        socketClient.updateActiveLocation(coords);
      }
    },
    routeCoordinates: route?.geometry?.coordinates || null,
    onOffRoute: handleOffRoute
  });

  // Socket.IO hook for real-time events
  const socketClient = useSocket({
    onHazardUpdated: (data) => {
      console.log('Real-time hazard update received:', data);
      if (data.action === 'added') {
        setHazards((prev) => {
          const id = data.hazard._id || data.hazard.id;
          const filtered = prev.filter((h) => (h._id || h.id) !== id);
          return [data.hazard, ...filtered];
        });
      } else if (data.action === 'resolved' || data.action === 'expired') {
        const id = data.hazard._id || data.hazard.id;
        setHazards((prev) => prev.filter((h) => (h._id || h.id) !== id));
      }
    },

    onAutoRerouted: (data) => {
      console.log('Automated reroute event received from server:', data);
      setRoute(data.newRoute);
      if (data.newRoute?.geometry?.coordinates && isSimulating) {
        updateSimulationRoute(data.newRoute.geometry.coordinates);
      }
      setAlert({
        type: 'warning',
        title: 'Hazard Detected Ahead! Rerouting...',
        message: data.message || 'Route automatically updated to detour around reported road hazard.',
        duration: 8000
      });
    },

    onHazardWarning: (data) => {
      setAlert({
        type: 'warning',
        title: 'Road Caution',
        message: data.message,
        duration: 7000
      });
    },

    onHazardCleared: (data) => {
      setAlert({
        type: 'info',
        title: 'Hazard Cleared',
        message: data.message,
        duration: 5000
      });
    }
  });

  // Initial load of all active hazards from backend
  useEffect(() => {
    fetchHazards('all')
      .then((data) => {
        setHazards(data);
      })
      .catch((err) => {
        console.warn('Initial hazards fetch error:', err.message);
      });
  }, []);

  // Recalculate route whenever origin or destination changes (outside active simulation)
  useEffect(() => {
    if (origin && destination && !isNavigating) {
      calculateRoute(origin, destination);
    }
  }, [origin, destination, isNavigating, calculateRoute]);

  // Role Switching Handlers
  const handleSwitchRole = (targetRole) => {
    if (targetRole === 'authority') {
      setIsAuthorityLoginOpen(true);
    } else {
      setUserRole('citizen');
      setApiRole('citizen');
      setAlert({
        type: 'info',
        title: 'Citizen Mode Active 👤',
        message: 'You can report, view all hazard photos & details across Indore.'
      });
    }
  };

  const handleAuthorityLoginSuccess = () => {
    setUserRole('authority');
    setApiRole('authority');
    setAlert({
      type: 'success',
      title: 'Authority Access Verified 🛡️',
      message: 'Logged in as Municipal / Traffic Officer. You can now resolve hazards and clear road obstacles.'
    });
  };

  // Handlers for Origin & Destination
  const handleSelectOrigin = (place) => {
    setOrigin(place);
  };

  const handleSelectDestination = (place) => {
    setDestination(place);
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      const loc = {
        name: 'My GPS Location',
        lat: userLocation[0],
        lon: userLocation[1]
      };
      setOrigin(loc);
      if (destination) calculateRoute(loc, destination);
    } else {
      startWatching();
      setAlert({
        type: 'info',
        title: 'Locating...',
        message: 'Requesting browser location coordinates.'
      });
    }
  };

  const handleSwap = () => {
    if (origin && destination) {
      const temp = origin;
      setOrigin(destination);
      setDestination(temp);
    }
  };

  // Start Navigation
  const handleStartNavigation = () => {
    if (!route || !route.success) return;
    setIsNavigating(true);
    setShowDirections(false);
    startWatching();

    // Register active navigation on backend Socket.IO
    socketClient.startActiveNavigation({
      origin: [origin.lat, origin.lon],
      destination: [destination.lat, destination.lon],
      currentLocation: userLocation || [origin.lat, origin.lon],
      geometry: route.geometry.coordinates
    });

    setAlert({
      type: 'success',
      title: 'Navigation Started',
      message: 'Following live route with real-time hazard monitoring.'
    });
  };

  // Exit Navigation
  const handleExitNavigation = () => {
    setIsNavigating(false);
    stopWatching();
    socketClient.stopActiveNavigation();
  };

  // Map Click handler (for picking destination or hazard pin)
  const handleMapClick = (coords) => {
    if (isPickingHazardLocation) {
      setReportModalCoords(coords);
      setIsPickingHazardLocation(false);
    } else if (!isNavigating) {
      // Set clicked point as destination
      const clickedPlace = {
        name: `Selected Pin (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`,
        lat: coords[0],
        lon: coords[1]
      };
      setDestination(clickedPlace);
    }
  };

  // Trigger quick report at current GPS position
  const handleQuickReport = () => {
    const coords = userLocation || (origin ? [origin.lat, origin.lon] : [22.6815, 75.8683]);
    setReportModalCoords(coords);
  };

  // When a hazard is reported successfully (Citizens & Authority)
  const handleHazardReported = (newHazard) => {
    setHazards((prev) => [newHazard, ...prev.filter((h) => (h._id || h.id) !== (newHazard._id || newHazard.id))]);
    setAlert({
      type: 'success',
      title: 'Hazard Reported',
      message: `Report for ${newHazard.type} (${newHazard.roadName || 'Indore'}) submitted successfully with photo.`
    });

    // If currently routing or navigating, re-evaluate route with new hazard
    if (origin && destination) {
      const startPoint = isNavigating && userLocation
        ? { name: 'Current Location', lat: userLocation[0], lon: userLocation[1] }
        : origin;

      calculateRoute(startPoint, destination).then((newRoute) => {
        if (newRoute?.geometry?.coordinates && isSimulating) {
          updateSimulationRoute(newRoute.geometry.coordinates);
        }
      });
    }
  };

  // When a hazard is resolved (Authority Only)
  const handleHazardResolved = (resolvedId) => {
    setHazards((prev) =>
      prev.map((h) =>
        (h._id || h.id) === resolvedId
          ? { ...h, status: 'resolved', resolvedAt: new Date().toISOString(), resolvedByRole: 'authority' }
          : h
      )
    );
    setAlert({
      type: 'info',
      title: 'Hazard Cleared by Authority 🛡️',
      message: 'Hazard marked as resolved and removed from routing penalties.'
    });
    if (origin && destination) {
      calculateRoute(origin, destination);
    }
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B0E14]' : 'bg-[#F8FAFC]'
      }`}
    >
      {/* Alert Toasts */}
      <AlertToast alert={alert} onDismiss={() => setAlert(null)} />

      {/* Header Bar with RBAC Switcher, Theme Switcher & Hazards Directory link */}
      <Header
        activeHazardsCount={hazards.filter((h) => h.status === 'active').length}
        isSocketConnected={socketClient.isConnected}
        isNavigating={isNavigating}
        userRole={userRole}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onSwitchRole={handleSwitchRole}
        onOpenAuthorityPanel={() => setIsAuthorityPanelOpen(true)}
        onOpenHazardsList={() => setIsHazardsListOpen(true)}
        onOpenReportModal={() => {
          setIsPickingHazardLocation(true);
          setAlert({
            type: 'info',
            title: 'Pin Hazard Location',
            message: 'Tap anywhere on the map to place the hazard report.'
          });
        }}
      />

      {/* Picking Hazard Location Helper Banner */}
      {isPickingHazardLocation && (
        <div className="absolute top-20 sm:top-[82px] left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-amber-500 text-slate-900 font-bold text-xs shadow-xl flex items-center space-x-2 animate-bounce pointer-events-auto">
          <span>Tap anywhere on the map to set hazard location</span>
          <button
            onClick={() => setIsPickingHazardLocation(false)}
            className="ml-2 font-black text-slate-800 hover:text-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reference UI Floating Navigation Drawer (Visible when NOT in active navigation HUD) */}
      {!isNavigating && (
        <ModernNavDrawer
          origin={origin}
          destination={destination}
          route={route}
          onSelectOrigin={handleSelectOrigin}
          onSelectDestination={handleSelectDestination}
          onSwap={handleSwap}
          isLoadingRoute={isLoadingRoute}
          isNavigating={isNavigating}
          onStartNavigation={handleStartNavigation}
          onToggleDirections={() => setShowDirections(!showDirections)}
          showDirections={showDirections}
          travelMode={travelMode}
          onSelectTravelMode={(mode) => setTravelMode(mode)}
          progressPercent={progressPercent}
          onSeekProgress={(pct) => seekSimulation(pct)}
          isSimulating={isSimulating}
          onToggleSimulation={() => {
            if (isSimulating) {
              stopWatching();
            } else if (route?.geometry?.coordinates) {
              startSimulation(route.geometry.coordinates);
            }
          }}
          theme={theme}
        />
      )}

      {/* Turn by Turn Directions Drawer */}
      {showDirections && route && !isNavigating && (
        <TurnByTurnPanel
          instructions={route.instructions}
          onClose={() => setShowDirections(false)}
        />
      )}

      {/* Active Navigation Full-Screen Overlay HUD */}
      {isNavigating && route && (
        <ActiveNavOverlay
          currentStep={route.instructions?.[1] || route.instructions?.[0]}
          route={route}
          speed={speed}
          isSimulating={isSimulating}
          isRerouting={isRerouting}
          onStartSimulation={() => startSimulation(route.geometry.coordinates)}
          onStopSimulation={stopWatching}
          onQuickReport={handleQuickReport}
          onExitNavigation={handleExitNavigation}
          theme={theme}
        />
      )}

      {/* Report Hazard Modal (Both Citizen & Authority) */}
      {reportModalCoords && (
        <ReportHazardModal
          coordinates={reportModalCoords}
          userRole={userRole}
          theme={theme}
          onClose={() => setReportModalCoords(null)}
          onHazardReported={handleHazardReported}
        />
      )}

      {/* Authority Login / Verification Modal */}
      <AuthorityLoginModal
        isOpen={isAuthorityLoginOpen}
        onClose={() => setIsAuthorityLoginOpen(false)}
        onLoginSuccess={handleAuthorityLoginSuccess}
      />

      {/* Authority Command Console Drawer */}
      <AuthorityPanel
        isOpen={isAuthorityPanelOpen}
        onClose={() => setIsAuthorityPanelOpen(false)}
        hazards={hazards.filter((h) => h.status === 'active')}
        onHazardResolved={handleHazardResolved}
      />

      {/* Complete Hazard Details Modal (Triggered by tapping hazard on map or in list) */}
      <HazardDetailsModal
        hazard={selectedHazard}
        isOpen={Boolean(selectedHazard)}
        onClose={() => setSelectedHazard(null)}
        userRole={userRole}
        theme={theme}
        onHazardResolved={handleHazardResolved}
        onFocusOnMap={(coords) => setFocusLocation(coords)}
      />

      {/* Citizens & Authorities Whole Hazards List Directory Modal */}
      <HazardsListModal
        isOpen={isHazardsListOpen}
        onClose={() => setIsHazardsListOpen(false)}
        hazards={hazards}
        userRole={userRole}
        theme={theme}
        onSelectHazard={(h) => setSelectedHazard(h)}
        onFocusOnMap={(coords) => setFocusLocation(coords)}
      />

      {/* Hazard Legend Modal */}
      <HazardLegend isOpen={showLegend} onClose={() => setShowLegend(false)} />

      {/* Leaflet Map View with Role-Based Marker Popups & Detail Selection */}
      <MapView
        origin={origin}
        destination={destination}
        route={route}
        hazards={hazards.filter((h) => h.status === 'active')}
        userLocation={userLocation}
        heading={heading}
        isNavigating={isNavigating}
        userRole={userRole}
        onMapClick={handleMapClick}
        onHazardResolved={handleHazardResolved}
        onSelectHazard={(h) => setSelectedHazard(h)}
        focusLocation={focusLocation}
        theme={theme}
        progressPercent={progressPercent}
        travelMode={travelMode}
      />
    </div>
  );
}
