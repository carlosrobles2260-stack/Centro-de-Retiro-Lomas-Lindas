import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth';
import { colores } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VisitasScreen from './src/screens/VisitasScreen';
import EscanerScreen from './src/screens/EscanerScreen';
import RegistrarVisitaScreen from './src/screens/RegistrarVisitaScreen';
import AccesoEmpleadoScreen from './src/screens/AccesoEmpleadoScreen';
import IncidentesScreen from './src/screens/IncidentesScreen';
import RondasScreen from './src/screens/RondasScreen';
import VertederoScreen from './src/screens/VertederoScreen';
import FlotaScreen from './src/screens/FlotaScreen';
import PerfilScreen from './src/screens/PerfilScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const encabezado = {
  headerStyle: { backgroundColor: colores.verde },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

// Stack del módulo de visitas (lista → escanear → registrar).
function VisitasStack() {
  return (
    <Stack.Navigator screenOptions={encabezado}>
      <Stack.Screen name="Visitas" component={VisitasScreen} options={{ title: 'Registro de visitas' }} />
      <Stack.Screen name="Escanear" component={EscanerScreen} options={{ title: 'Escanear credencial' }} />
      <Stack.Screen name="RegistrarVisita" component={RegistrarVisitaScreen} options={{ title: 'Registrar visita' }} />
      <Stack.Screen name="AccesoEmpleado" component={AccesoEmpleadoScreen} options={{ title: 'Acceso de empleado' }} />
    </Stack.Navigator>
  );
}

function iconoTab(emoji) {
  return ({ focused }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...encabezado,
        tabBarActiveTintColor: colores.verde,
        tabBarInactiveTintColor: colores.textoSuave,
      }}
    >
      <Tab.Screen name="Panel" component={DashboardScreen} options={{ tabBarIcon: iconoTab('🏠') }} />
      <Tab.Screen name="VisitasTab" component={VisitasStack} options={{ title: 'Visitas', headerShown: false, tabBarLabel: 'Visitas', tabBarIcon: iconoTab('🚪') }} />
      <Tab.Screen name="Incidentes" component={IncidentesScreen} options={{ tabBarIcon: iconoTab('⚠️') }} />
      <Tab.Screen name="Rondas" component={RondasScreen} options={{ tabBarIcon: iconoTab('🧭') }} />
      <Tab.Screen name="Vertedero" component={VertederoScreen} options={{ title: 'Vertedero', tabBarIcon: iconoTab('🚛') }} />
      <Tab.Screen name="Flota" component={FlotaScreen} options={{ title: 'Flota GPS', tabBarIcon: iconoTab('🛰️') }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarIcon: iconoTab('👤') }} />
    </Tab.Navigator>
  );
}

function Raiz() {
  const { usuario, cargando } = useAuth();
  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colores.verde }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {usuario ? <AppTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Raiz />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
