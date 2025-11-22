import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  MapPin,
  Radio,
  Battery,
  AlertTriangle,
  CheckCircle,
  Download,
  X,
  Menu,
  Home,
  Layers,
  Users,
} from 'lucide-react';

type DeviceStatus = 'active' | 'idle' | 'alarm' | 'offline' | 'low-battery';
type AlertType = 'geofence_exit' | 'geofence_enter' | 'no_movement' | 'tamper' | 'low_battery';
type Species = 'cattle' | 'sheep' | 'goat';

interface Device {
  id: string;
  animalId?: string;
  vendor: string;
  species: Species;
  lastFix: { lat: number; lon: number; timestamp: string };
  batteryPct: number;
  signalStrength: number;
  status: DeviceStatus;
  herdId?: string;
  owner?: { name: string; phone: string; brandNumber?: string };
}

interface Geofence {
  id: string;
  name: string;
  polygon: [number, number][];
  color: string;
  alerts: { onEnter: boolean; onExit: boolean };
  assignedDevices: string[];
}

interface Alert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviceId: string;
  geofenceId?: string;
  timestamp: string;
  location?: { lat: number; lon: number };
  message: string;
  resolved: boolean;
}

const generateMockDevices = (): Device[] => {
  const devices: Device[] = [];
  const vendors = ['farmranger', 'grazertrack', 'isitech'];
  const species: Species[] = ['cattle', 'sheep', 'goat'];
  const statuses: DeviceStatus[] = ['active', 'idle', 'alarm', 'offline', 'low-battery'];

  const centerLat = -25.7479;
  const centerLon = 28.2293;

  for (let i = 0; i < 50; i++) {
    const randomLat = centerLat + (Math.random() - 0.5) * 0.5;
    const randomLon = centerLon + (Math.random() - 0.5) * 0.5;

    devices.push({
      id: `DEV${String(i + 1).padStart(4, '0')}`,
      animalId: `A${String(i + 1).padStart(3, '0')}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      species: species[Math.floor(Math.random() * species.length)],
      lastFix: {
        lat: randomLat,
        lon: randomLon,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      },
      batteryPct: Math.floor(Math.random() * 100),
      signalStrength: Math.floor(Math.random() * 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      owner: {
        name: `Farmer ${i + 1}`,
        phone: `+27 ${Math.floor(Math.random() * 900000000 + 100000000)}`,
        brandNumber: `BR${String(i + 1).padStart(4, '0')}`,
      },
    });
  }

  return devices;
};

const generateMockGeofences = (): Geofence[] => [
  {
    id: 'GF001',
    name: 'North Pasture',
    polygon: [
      [28.2, -25.72],
      [28.25, -25.72],
      [28.25, -25.76],
      [28.2, -25.76],
    ],
    color: '#22c55e',
    alerts: { onEnter: false, onExit: true },
    assignedDevices: ['DEV0001', 'DEV0002', 'DEV0003'],
  },
  {
    id: 'GF002',
    name: 'South Paddock',
    polygon: [
      [28.21, -25.77],
      [28.26, -25.77],
      [28.26, -25.8],
      [28.21, -25.8],
    ],
    color: '#3b82f6',
    alerts: { onEnter: true, onExit: true },
    assignedDevices: ['DEV0004', 'DEV0005'],
  },
];

const generateMockAlerts = (devices: Device[]): Alert[] => {
  const alerts: Alert[] = [];
  const types: AlertType[] = ['geofence_exit', 'geofence_enter', 'no_movement', 'low_battery'];

  for (let i = 0; i < 15; i++) {
    const device = devices[Math.floor(Math.random() * devices.length)];
    alerts.push({
      id: `ALT${String(i + 1).padStart(4, '0')}`,
      type: types[Math.floor(Math.random() * types.length)],
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Alert['severity'],
      deviceId: device.id,
      geofenceId: Math.random() > 0.5 ? 'GF001' : undefined,
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
      location: device.lastFix,
      message: `Alert for device ${device.id}`,
      resolved: Math.random() > 0.3,
    });
  }

  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const getStatusColor = (status: DeviceStatus): string => {
  const colors = {
    active: '#22c55e',
    idle: '#f59e0b',
    alarm: '#ef4444',
    offline: '#6b7280',
    'low-battery': '#eab308',
  };
  return colors[status];
};

const SimpleMap: React.FC<{
  devices: Device[];
  geofences: Geofence[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device | null) => void;
  showGeofences: boolean;
}> = ({ devices, geofences, selectedDevice, onSelectDevice, showGeofences }) => {
  const [zoom, setZoom] = useState(10);
  const [center, setCenter] = useState({ lat: -25.7479, lon: 28.2293 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = React.useRef<SVGSVGElement>(null);

  const latLonToPixel = (lat: number, lon: number) => {
    const width = svgRef.current?.clientWidth || 1200;
    const height = svgRef.current?.clientHeight || 600;

    const mapBounds = {
      minLat: center.lat - 0.3 / zoom,
      maxLat: center.lat + 0.3 / zoom,
      minLon: center.lon - 0.4 / zoom,
      maxLon: center.lon + 0.4 / zoom,
    };

    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * width;
    const y = ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * height;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) * 0.0001 * (10 / zoom);
      const dy = (e.clientY - dragStart.y) * 0.0001 * (10 / zoom);
      setCenter((prev) => ({
        lat: prev.lat + dy,
        lon: prev.lon - dx,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        width="100%"
        height="600"
        className="bg-gray-100 rounded-lg cursor-move w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {showGeofences &&
          geofences.map((geofence) => {
            const points = geofence.polygon
              .map(([lon, lat]) => {
                const { x, y } = latLonToPixel(lat, lon);
                return `${x},${y}`;
              })
              .join(' ');

            const firstPoint = latLonToPixel(geofence.polygon[0][1], geofence.polygon[0][0]);

            return (
              <g key={geofence.id}>
                <polygon
                  points={points}
                  fill={geofence.color}
                  fillOpacity="0.2"
                  stroke={geofence.color}
                  strokeWidth="2"
                />
                <text
                  x={firstPoint.x}
                  y={firstPoint.y - 10}
                  fill={geofence.color}
                  fontSize="12"
                  fontWeight="bold"
                >
                  {geofence.name}
                </text>
              </g>
            );
          })}

        {devices.map((device) => {
          const { x, y } = latLonToPixel(device.lastFix.lat, device.lastFix.lon);
          const color = getStatusColor(device.status);

          return (
            <g
              key={device.id}
              onClick={() => onSelectDevice(device)}
              className="cursor-pointer transition-transform"
            >
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={color}
                stroke="white"
                strokeWidth="2"
                opacity={selectedDevice?.id === device.id ? 1 : 0.8}
              />
              {selectedDevice?.id === device.id && (
                <circle cx={x} cy={y} r="12" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={() => setZoom((z) => Math.min(z + 2, 20))}
          className="block w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 2, 2))}
          className="block w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
        >
          −
        </button>
      </div>

      {selectedDevice && (
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-auto bg-white rounded-lg shadow-lg p-3 md:p-4 max-w-full sm:max-w-xs">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-base md:text-lg truncate pr-2">
              {selectedDevice.animalId || selectedDevice.id}
            </h3>
            <button onClick={() => onSelectDevice(null)} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-xs md:text-sm">
            <p>
              <span className="font-medium">Species:</span> {selectedDevice.species}
            </p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span style={{ color: getStatusColor(selectedDevice.status) }}>{selectedDevice.status}</span>
            </p>
            <p>
              <span className="font-medium">Battery:</span> {selectedDevice.batteryPct}%
            </p>
            <p>
              <span className="font-medium">Signal:</span> {selectedDevice.signalStrength}%
            </p>
            <p className="text-xs text-gray-500 truncate">
              Last seen: {new Date(selectedDevice.lastFix.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => (
  <div className="bg-white rounded-lg shadow p-4 md:p-6">
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-xs md:text-sm text-gray-600 truncate">{label}</p>
        <p className="text-xl md:text-3xl font-bold mt-1 md:mt-2">{value}</p>
      </div>
      <div className={`p-2 md:p-3 rounded-full ${color} flex-shrink-0`}>{icon}</div>
    </div>
  </div>
);

const Dashboard: React.FC<{ devices: Device[]; alerts: Alert[] }> = ({ devices, alerts }) => {
  const activeDevices = devices.filter((d) => d.status === 'active').length;
  const alarmDevices = devices.filter((d) => d.status === 'alarm').length;
  const avgBattery = Math.round(devices.reduce((sum, d) => sum + d.batteryPct, 0) / devices.length);
  const unresolvedAlerts = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full">
        <KPICard icon={<Radio className="w-5 h-5 md:w-6 md:h-6 text-white" />} label="Active Devices" value={activeDevices} color="bg-green-500" />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          label="Devices in Alarm"
          value={alarmDevices}
          color="bg-red-500"
        />
        <KPICard icon={<Battery className="w-5 h-5 md:w-6 md:h-6 text-white" />} label="Avg. Battery" value={`${avgBattery}%`} color="bg-blue-500" />
        <KPICard
          icon={<Bell className="w-5 h-5 md:w-6 md:h-6 text-white" />}
          label="Unresolved Alerts"
          value={unresolvedAlerts}
          color="bg-orange-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 w-full">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Recent Alerts</h2>
        <div className="space-y-2 md:space-y-3">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <AlertTriangle
                  className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm md:text-base truncate">{alert.type.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-xs md:text-sm text-gray-600 truncate">Device: {alert.deviceId}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end sm:text-right gap-3 text-xs md:text-sm flex-shrink-0">
                <p className="text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                {alert.resolved ? (
                  <span className="text-green-600 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle className="w-3 h-3" /> Resolved
                  </span>
                ) : (
                  <span className="text-red-600 whitespace-nowrap">Unresolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MapView: React.FC<{
  devices: Device[];
  geofences: Geofence[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device | null) => void;
}> = ({ devices, geofences, selectedDevice, onSelectDevice }) => {
  const [showGeofences, setShowGeofences] = useState(true);

  return (
    <div className="space-y-3 md:space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Live Map</h1>
        <button
          onClick={() => setShowGeofences(!showGeofences)}
          className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 text-sm md:text-base"
        >
          <Layers className="w-4 h-4 md:w-5 md:h-5" />
          {showGeofences ? 'Hide' : 'Show'} Geofences
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden w-full">
        <SimpleMap
          devices={devices}
          geofences={geofences}
          selectedDevice={selectedDevice}
          onSelectDevice={onSelectDevice}
          showGeofences={showGeofences}
        />
      </div>
    </div>
  );
};

const DevicesList: React.FC<{ devices: Device[]; onSelectDevice: (device: Device) => void }> = ({ devices, onSelectDevice }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');

  const filteredDevices = useMemo(
    () =>
      devices.filter((device) => {
        const matchesSearch =
          device.id.toLowerCase().includes(filter.toLowerCase()) ||
          device.animalId?.toLowerCase().includes(filter.toLowerCase());
        const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [devices, filter, statusFilter],
  );

  return (
    <div className="space-y-3 md:space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Devices</h1>
        <button className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 text-sm md:text-base">
          <Download className="w-4 h-4 md:w-5 md:h-5" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <input
          type="text"
          placeholder="Search devices..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base w-full"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | 'all')}
          className="px-3 md:px-4 py-2 border rounded-lg text-sm md:text-base w-full sm:w-auto"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="alarm">Alarm</option>
          <option value="offline">Offline</option>
          <option value="low-battery">Low Battery</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Device ID</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Animal ID</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Species</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Battery</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Last Seen</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium">{device.id}</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm">{device.animalId}</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm capitalize">{device.species}</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: getStatusColor(device.status), color: 'white' }}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm">{device.batteryPct}%</td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                    {new Date(device.lastFix.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm">
                    <button onClick={() => onSelectDevice(device)} className="text-blue-600 hover:text-blue-800">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AlertsPage: React.FC<{ alerts: Alert[]; devices: Device[]; onResolveAlert: (alertId: string) => void }> = ({
  alerts,
  devices,
  onResolveAlert,
}) => {
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');

  const filteredAlerts = alerts.filter((alert) => filter === 'all' || !alert.resolved);

  const getDevice = (deviceId: string) => devices.find((d) => d.id === deviceId);

  return (
    <div className="space-y-3 md:space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Alerts</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg text-sm md:text-base ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg text-sm md:text-base ${
              filter === 'unresolved' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Unresolved
          </button>
        </div>
      </div>

      <div className="space-y-3 w-full">
        {filteredAlerts.map((alert) => {
          const device = getDevice(alert.deviceId);
          return (
            <div key={alert.id} className="bg-white rounded-lg shadow p-3 md:p-4 w-full">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 ${alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base md:text-lg">{alert.type.replace(/_/g, ' ').toUpperCase()}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : alert.severity === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1 truncate">Device: {alert.deviceId}</p>
                    {device && <p className="text-xs md:text-sm text-gray-600 truncate">Animal: {device.animalId} ({device.species})</p>}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.timestamp).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
                    </p>
                    {alert.location && (
                      <p className="text-xs text-gray-500 truncate">
                        Location: {alert.location.lat.toFixed(4)}, {alert.location.lon.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                  {alert.resolved ? (
                    <span className="text-xs md:text-sm text-green-600 flex items-center gap-1 justify-center py-2">
                      <CheckCircle className="w-4 h-4" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg text-xs md:text-sm hover:bg-green-700 whitespace-nowrap"
                    >
                      Resolve
                    </button>
                  )}
                  <button className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm hover:bg-blue-700 whitespace-nowrap">
                    View Map
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'map' | 'devices' | 'alerts' | 'settings'>('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const mockDevices = generateMockDevices();
    const mockGeofences = generateMockGeofences();
    const mockAlerts = generateMockAlerts(mockDevices);

    setDevices(mockDevices);
    setGeofences(mockGeofences);
    setAlerts(mockAlerts);

    const interval = setInterval(
      () =>
        setDevices((prev) =>
          prev.map((device) => ({
            ...device,
            batteryPct: Math.max(0, device.batteryPct - Math.random() * 2),
            lastFix: {
              ...device.lastFix,
              timestamp: new Date().toISOString(),
            },
          })),
        ),
      30000,
    );

    return () => clearInterval(interval);
  }, []);

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, resolved: true } : alert)));
  };

  const NavItem: React.FC<{ icon: React.ReactNode; label: string; page: typeof currentPage; active: boolean }> = ({
    icon,
    label,
    page,
    active,
  }) => (
    <button
      onClick={() => {
        setCurrentPage(page);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full ${
        active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block w-64 bg-white shadow-lg fixed lg:relative h-full z-50 overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-blue-600">LiveStock Track</h1>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="space-y-2">
            <NavItem icon={<Home className="w-5 h-5" />} label="Dashboard" page="dashboard" active={currentPage === 'dashboard'} />
            <NavItem icon={<MapPin className="w-5 h-5" />} label="Live Map" page="map" active={currentPage === 'map'} />
            <NavItem icon={<Radio className="w-5 h-5" />} label="Devices" page="devices" active={currentPage === 'devices'} />
            <NavItem icon={<Bell className="w-5 h-5" />} label="Alerts" page="alerts" active={currentPage === 'alerts'} />
            <NavItem icon={<Users className="w-5 h-5" />} label="Settings" page="settings" active={currentPage === 'settings'} />
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-white">
          <div className="text-sm text-gray-600">
            <p className="font-medium">Demo Mode</p>
            <p className="text-xs">South Africa | SAST</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="bg-white shadow-sm p-4 flex items-center justify-between lg:hidden flex-shrink-0">
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">LiveStock Track</h1>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 w-full">
          <div className="w-full max-w-full overflow-hidden">
            {currentPage === 'dashboard' && <Dashboard devices={devices} alerts={alerts} />}
            {currentPage === 'map' && (
              <MapView devices={devices} geofences={geofences} selectedDevice={selectedDevice} onSelectDevice={setSelectedDevice} />
            )}
            {currentPage === 'devices' && <DevicesList devices={devices} onSelectDevice={setSelectedDevice} />}
            {currentPage === 'alerts' && (
              <AlertsPage alerts={alerts} devices={devices} onResolveAlert={handleResolveAlert} />
            )}
            {currentPage === 'settings' && (
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-6">Settings</h1>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-3">Organization</h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Organization Name</label>
                        <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Your Organization" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Timezone</label>
                        <select className="w-full px-4 py-2 border rounded-lg">
                          <option>Africa/Johannesburg (SAST +02:00)</option>
                          <option>UTC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Currency</label>
                        <select className="w-full px-4 py-2 border rounded-lg">
                          <option>ZAR (South African Rand)</option>
                          <option>USD</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-3">Vendor Integrations</h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <div>
                            <p className="font-medium">FarmRanger</p>
                            <p className="text-sm text-gray-600">Connected</p>
                          </div>
                        </div>
                        <span className="text-xs md:text-sm text-gray-500">Last sync: 2 mins ago</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <div>
                            <p className="font-medium">Grazertrack</p>
                            <p className="text-sm text-gray-600">Connected</p>
                          </div>
                        </div>
                        <span className="text-xs md:text-sm text-gray-500">Last sync: 5 mins ago</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                          <div>
                            <p className="font-medium">iSi-TAG</p>
                            <p className="text-sm text-gray-600">Connected</p>
                          </div>
                        </div>
                        <span className="text-xs md:text-sm text-gray-500">Last sync: 1 min ago</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-3">Notification Preferences</h2>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>SMS Alerts (via Vodacom)</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>WhatsApp Notifications</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>Email Alerts</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" className="w-4 h-4" />
                        <span>Push Notifications</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Settings</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
    </div>
  );
};

export default App;
