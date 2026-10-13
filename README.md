# 🏪 Agabo — Frontend del Sistema de Inventario

![Estado](<https://img.shields.io/badge/estado-en%20desarrollo-yellow>)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss)

---


## 📋 Tabla de Contenidos

1. [¿Qué es Agabo?](#-qué-es-agabo)
2. [Stack Tecnológico](#-stack-tecnológico)
3. [Arquitectura en Capas](#-arquitectura-en-capas)
4. [Flujo de Datos](#-flujo-de-datos)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Módulos del Sistema](#-módulos-del-sistema)
7. [Modelos de Datos (Entidades)](#-modelos-de-datos-entidades)
8. [Patrón Repositorio](#-patrón-repositorio)
9. [Autenticación y Roles](#-autenticación-y-roles)
10. [Inicio Rápido](#-inicio-rápido)
11. [Convenciones de Código](#-convenciones-de-código)

---

## 🧐 ¿Qué es Agabo?

**Agabo** es un sistema de inventario desacoplado, diseñado para que cualquier comercio con **múltiples sedes (sucursales)** pueda gestionar sus productos, proveedores y stock de forma centralizada.

### ¿Qué significa "desacoplado"?

Significa que el **frontend** (esta app) y el **backend** (la base de datos + lógica del servidor) son independientes. Se comunican a través de una API. Esto nos permite:

- Cambiar el backend sin tocar el frontend (y viceversa)
- Escalar cada parte por separado
- Usar tecnologías distintas en cada lado

---

## 🛠️ Stack Tecnológico

Cada tecnología fue elegida con un propósito. Aquí te explico por qué:

### Frontend

| Tecnología            | Versión | ¿Para qué sirve?                              | ¿Por qué la elegimos?                                                                                                           |
| ---------------------- | -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **React**        | 18       | Biblioteca para construir interfaces de usuario | Es la más popular, tiene mucho ecosistema y comunidad. Permite crear SPAs (Single Page Applications) rápidas y reactivas.       |
| **TypeScript**   | 5        | JavaScript con tipos estáticos                 | Evita errores en tiempo de desarrollo. Hace el código más predecible y autodocumentado. Ideal para equipos.                     |
| **Vite**         | 5        | Empaquetador y servidor de desarrollo           | Es **mucho más rápido** que Create React App o Webpack. Arranca en milisegundos y recarga al instante.                   |
| **Tailwind CSS** | 3        | Framework de estilos utilitario                 | Escribimos CSS directamente en el HTML/JSX usando clases como`flex`, `p-4`, `text-lg`. No necesitamos archivos CSS enormes. |
| **React Router** | 6        | Router para navegación SPA                     | Permite cambiar de página (ej: de Productos a Proveedores) sin recargar el navegador.                                            |
| **Zustand**      | 4        | Manejo de estado global                         | Alternativa ligera a Redux. Con pocas líneas tenemos un almacén de datos accesible desde cualquier componente.                  |
| **Lucide React** | —       | Librería de iconos                             | Iconos modernos, limpios y personalizables.                                                                                       |
| **Axios**        | 1        | Cliente HTTP para peticiones al backend         | Más fácil que fetch nativo. Maneja errores, interceptores, y tiene mejor sintaxis.                                              |

### Backend (Infraestructura de Datos)

| Tecnología        | ¿Para qué sirve?                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase** | Plataforma que nos da: base de datos PostgreSQL, autenticación, almacenamiento de archivos y API REST automática. Es como un Firebase open source. |

### Herramientas de Desarrollo

| Herramienta        | ¿Para qué sirve?                                                   |
| ------------------ | -------------------------------------------------------------------- |
| **ESLint**   | Analiza el código en busca de errores y malas prácticas            |
| **Prettier** | Formatea el código automáticamente para que todos escribamos igual |

---

## 🏗️ Arquitectura en Capas

Esta es la parte más importante del proyecto. Dividimos el código en **4 capas** con responsabilidades muy claras.

Piensa en esto como un **restaurante**:

| Capa                         | Analogía                                         | Responsabilidad                                          |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| **Presentación** 🍽️ | El mesero que interactúa con el cliente          | Componentes React, páginas, lo que el usuario ve y toca |
| **Aplicación** 🧑‍🍳 | El chef que coordina los pedidos                  | Hooks, stores, orquesta la lógica                       |
| **Dominio** 📋         | La receta del plato (el conocimiento del negocio) | Interfaces, tipos, contratos puros                       |
| **Infraestructura** 🚚 | El proveedor de ingredientes                      | Supabase, APIs externas, todo lo que puede cambiar       |

### 📊 Diagrama Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🍽️ PRESENTACIÓN (UI Layer)                       │
│                                                                     │
│  Pages: LoginPage, ProductListPage, DashboardPage, MetricsPage...   │
│  Components: Sidebar, DataTable, Modal, Button, Card...             │
│  Routing: AppRouter (React Router)                                  │
│                                                                     │
│  🎯 Objetivo: Solo renderizar lo que ve el usuario.                │
│  🚫 NO debe: Llamar a Supabase ni saber nada de la base de datos. │
├─────────────────────────────────────────────────────────────────────┤
│                    🧑‍🍳 APLICACIÓN (Application Layer)                │
│                                                                     │
│  Hooks: useProducts, useSuppliers, useAuth, useInventory...         │
│  Stores: useAuthStore, useProductStore, useUIStore (Zustand)        │
│  Providers: RepositoryProvider (inyecta dependencias)               │
│                                                                     │
│  🎯 Objetivo: Orquestar la lógica, conectar UI con datos.          │
│  🚫 NO debe: Saber si los datos vienen de Supabase o de otro lado. │
├─────────────────────────────────────────────────────────────────────┤
│                    📋 DOMINIO (Domain Layer)                         │
│                                                                     │
│  Models: Product, Supplier, Branch, Movement, User (interfaces TS)  │
│  Repository Interfaces: IProductRepository, ISupplierRepository...  │
│                                                                     │
│  🎯 Objetivo: Definir los contratos. Esto es el "idioma" del       │
│               negocio. Esta capa NO depende de nada externo.        │
│  ✅ Es la capa más estable. Casi nunca cambia.                     │
├─────────────────────────────────────────────────────────────────────┤
│                    🚚 INFRAESTRUCTURA (Infrastructure Layer)         │
│                                                                     │
│  Supabase Client: login, conexión a la base de datos                │
│  Repositorios: SupabaseProductRepository, SupabaseAuthRepository... │
│                                                                     │
│  🎯 Objetivo: Implementar los contratos del dominio usando una      │
│               tecnología específica (hoy Supabase).                 │
│  🔄 Puede cambiar: Si mañana migramos a un backend propio,         │
│     reemplazamos esta capa completa sin tocar el resto de la app.   │
└─────────────────────────────────────────────────────────────────────┘
```

### Regla de Oro: Las Dependencias Apuntan Hacia Adentro

```
Presentación → Aplicación → Dominio ← Infraestructura
```

Las capas externas (Presentación, Infraestructura) **dependen** de las internas (Aplicación, Dominio), pero **nunca al revés**. El Dominio no sabe que existe Supabase, y la Presentación no sabe cómo se guardan los datos.

---

## 🔄 Flujo de Datos

Así viaja la información cuando un usuario hace clic en "Ver productos":

```
1. Usuario hace clic en "Productos"
        │
2. ProductListPage.tsx (Presentación)
   Llama al hook: useProducts()
        │
3. useProducts.ts (Aplicación)
   Toma el repositorio del contexto: useContext(RepoContext)
   Llama: productRepo.getAll({ branchId: '123' })
        │
4. SupabaseProductRepository.ts (Infraestructura)
   Ejecuta: supabase.from('products').select('*')
        │
5. Supabase (Base de datos)
   Devuelve los datos en formato JSON
        │
6. SupabaseProductRepository.ts
   Mapea la respuesta a nuestro modelo Product (dominio)
        │
7. useProducts.ts (Aplicación)
   Guarda los datos en el store: productStore.setProducts(data)
        │
8. ProductListPage.tsx (Presentación)
   Lee del store y renderiza la tabla con los productos
```

### ⚡ Beneficio Clave de esta Arquitectura

Si mañana decidimos migrar de Supabase a un backend en Node.js + Express:

1. Creamos `RestProductRepository` que implementa `IProductRepository`
2. En `RepositoryProvider`, cambiamos la inyección:

```typescript
// Antes (Supabase)
const repositories = {
  products: new SupabaseProductRepository(client),
};

// Después (REST)
const repositories = {
  products: new RestProductRepository('https://api.miservicio.com'),
};
```

3. **¡Todo el frontend sigue funcionando sin cambios!** Los componentes, hooks y stores no se enteraron del cambio.

---

## 📁 Estructura del Proyecto

```
agabo-frontend/
│
├── public/                          # Archivos estáticos (imágenes, favicon)
│   └── favicon.svg
│
├── src/
│   │
│   ├── domain/                      # 🟡 CAPA DE DOMINIO (pura, sin dependencias)
│   │   ├── models/                  # Interfaces de las entidades del negocio
│   │   │   ├── product.ts           #   → Product, CreateProductDTO, ProductStock
│   │   │   ├── supplier.ts          #   → Supplier, PurchaseOrder
│   │   │   ├── branch.ts            #   → Branch
│   │   │   ├── movement.ts          #   → Movement, MovementType
│   │   │   ├── user.ts              #   → User, UserRole, AuthCredentials
│   │   │   └── index.ts             #   → Barrel export (reexporta todo)
│   │   │
│   │   └── repositories/            # Interfaces de repositorios (los contratos)
│   │       ├── IProductRepository.ts
│   │       ├── ISupplierRepository.ts
│   │       ├── IBranchRepository.ts
│   │       ├── IMovementRepository.ts
│   │       ├── IAuthRepository.ts
│   │       └── index.ts
│   │
│   ├── infrastructure/              # 🟠 CAPA DE INFRAESTRUCTURA
│   │   ├── supabase/                # Todo lo relacionado con Supabase
│   │   │   ├── client.ts            #   → Crea y exporta el cliente Supabase
│   │   │   ├── repositories/        #   → Implementaciones concretas
│   │   │   │   ├── ProductRepository.ts
│   │   │   │   ├── SupplierRepository.ts
│   │   │   │   ├── BranchRepository.ts
│   │   │   │   ├── MovementRepository.ts
│   │   │   │   └── AuthRepository.ts
│   │   │   └── index.ts
│   │   │
│   │   └── mocks/                   # Datos falsos para desarrollo inicial
│   │       ├── products.ts
│   │       ├── suppliers.ts
│   │       ├── branches.ts
│   │       └── users.ts
│   │
│   ├── application/                 # 🟢 CAPA DE APLICACIÓN
│   │   ├── hooks/                   # Custom hooks de React
│   │   │   ├── useProducts.ts
│   │   │   ├── useSuppliers.ts
│   │   │   ├── useBranches.ts
│   │   │   ├── useInventory.ts
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── stores/                  # Estado global con Zustand
│   │   │   ├── useAuthStore.ts      #   → Usuario logueado, token, rol
│   │   │   ├── useProductStore.ts   #   → Lista de productos, loading, filtros
│   │   │   ├── useBranchStore.ts    #   → Sede activa, lista de sedes
│   │   │   └── useUIStore.ts        #   → Sidebar abierto/cerrado, modales
│   │   │
│   │   └── providers/               # Contextos de React para inyección
│   │       └── RepositoryProvider.tsx  # Inyecta los repositorios en la app
│   │
│   ├── presentation/                # 🟣 CAPA DE PRESENTACIÓN
│   │   ├── components/
│   │   │   ├── layout/              # Componentes de estructura general
│   │   │   │   ├── AppShell.tsx     #   → Layout principal (sidebar + contenido)
│   │   │   │   ├── Sidebar.tsx      #   → Menú lateral con navegación
│   │   │   │   ├── Navbar.tsx       #   → Barra superior con usuario y sede activa
│   │   │   │   └── BranchSelector.tsx  # → Selector de sede activa
│   │   │   │
│   │   │   ├── ui/                  # Componentes base reutilizables
│   │   │   │   ├── Button.tsx       #   → Botón con variantes (primary, danger, ghost)
│   │   │   │   ├── Input.tsx        #   → Input con label, error, icono
│   │   │   │   ├── Select.tsx       #   → Select dropdown
│   │   │   │   ├── Modal.tsx        #   → Ventana modal genérica
│   │   │   │   ├── Table.tsx        #   → Tabla básica con encabezados
│   │   │   │   ├── Badge.tsx        #   → Etiqueta de estado (stock bajo, activo, etc)
│   │   │   │   └── Card.tsx         #   → Tarjeta contenedora
│   │   │   │
│   │   │   └── shared/              # Componentes compartidos del negocio
│   │   │       ├── DataTable.tsx    #   → Tabla avanzada con búsqueda y paginación
│   │   │       ├── SearchInput.tsx  #   → Input de búsqueda con debounce
│   │   │       ├── EmptyState.tsx   #   → Estado "no hay datos" con icono
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── ConfirmDialog.tsx # → Diálogo de confirmación ("¿Estás seguro?")
│   │   │
│   │   └── features/                # 🗂️ Módulos por funcionalidad
│   │       ├── auth/
│   │       │   └── LoginPage.tsx
│   │       │
│   │       ├── dashboard/
│   │       │   └── DashboardPage.tsx
│   │       │
│   │       ├── products/
│   │       │   ├── ProductListPage.tsx    # → Lista con tabla, búsqueda, filtros
│   │       │   ├── ProductFormPage.tsx    # → Crear/editar producto
│   │       │   ├── ProductDetailPage.tsx  # → Detalle con stock por sede
│   │       │   └── components/
│   │       │       ├── ProductTable.tsx
│   │       │       ├── ProductForm.tsx
│   │       │       └── StockByBranch.tsx
│   │       │
│   │       ├── suppliers/
│   │       │   ├── SupplierListPage.tsx
│   │       │   ├── SupplierFormPage.tsx
│   │       │   └── components/
│   │       │       ├── SupplierTable.tsx
│   │       │       ├── SupplierForm.tsx
│   │       │       └── PurchaseOrderList.tsx
│   │       │
│   │       ├── branches/
│   │       │   ├── BranchListPage.tsx
│   │       │   ├── BranchFormPage.tsx
│   │       │   └── components/
│   │       │       ├── BranchTable.tsx
│   │       │       └── BranchForm.tsx
│   │       │
│   │       ├── inventory/
│   │       │   ├── MovementsPage.tsx       # → Historial de movimientos
│   │       │   ├── NewMovementPage.tsx     # → Registrar entrada/salida/ajuste
│   │       │   ├── TransferPage.tsx        # → Transferencia entre sedes
│   │       │   └── components/
│   │       │       ├── MovementTable.tsx
│   │       │       ├── MovementForm.tsx
│   │       │       └── TransferForm.tsx
│   │       │
│   │       └── metrics/
│   │           ├── MetricsPage.tsx
│   │           └── components/
│   │               ├── KpiCard.tsx
│   │               ├── StockChart.tsx
│   │               └── LowStockTable.tsx
│   │
│   ├── shared/                       # ⚪ UTILIDADES COMPARTIDAS
│   │   ├── utils/
│   │   │   ├── format.ts            # → Formatear monedas, fechas, números
│   │   │   ├── validations.ts       # → Validaciones de formularios
│   │   │   └── constants.ts         # → Constantes globales
│   │   │
│   │   └── types/
│   │       └── common.ts            # → Tipos genéricos (Pagination, ApiResponse, etc.)
│   │
│   ├── App.tsx                       # Componente raíz (Providers + Router)
│   ├── main.tsx                      # Punto de entrada (renderiza App)
│   └── index.css                     # Estilos globales + directivas Tailwind
│
├── .env                              # Variables de entorno (SUPABASE_URL, SUPABASE_KEY)
├── .env.example                      # Plantilla de .env (sin valores reales)
├── .gitignore                        # Archivos que git debe ignorar
├── index.html                        # HTML principal donde se monta React
├── package.json                      # Dependencias y scripts del proyecto
├── tsconfig.json                     # Configuración de TypeScript
├── vite.config.ts                    # Configuración de Vite
├── tailwind.config.js                # Configuración de Tailwind CSS
├── postcss.config.js                 # Configuración de PostCSS (necesario para Tailwind)
├── eslint.config.js                  # Reglas de ESLint
└── README.md                         # Este archivo
```

---

## 🧩 Módulos del Sistema

Cada módulo es una funcionalidad completa del negocio:

| Módulo                  | Páginas                                                 | ¿Qué hace?                                                           |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Auth** 🔐        | `LoginPage`                                            | Inicio de sesión, selección de sede, protección de rutas según rol |
| **Dashboard** 📊   | `DashboardPage`                                        | Resumen con tarjetas de KPIs, stock bajo, últimos movimientos         |
| **Productos** 📦   | `Lista`, `Formulario`, `Detalle`                   | CRUD de productos, ver stock por sede, categorías                     |
| **Proveedores** 🤝 | `Lista`, `Formulario`                                | CRUD de proveedores, productos que nos venden, órdenes de compra      |
| **Sedes** 🏪       | `Lista`, `Formulario`                                | CRUD de sedes/sucursales, gestión de locales                          |
| **Inventario** 🔄  | `Movimientos`, `Nuevo Movimiento`, `Transferencia` | Registrar entradas/salidas/ajustes, transferir stock entre sedes       |
| **Métricas** 📈   | `MetricsPage`                                          | Reportes visuales con gráficos, exportación de datos                 |

---

## 📐 Modelos de Datos (Entidades)

Estos son los **tipos principales** del sistema, definidos en la capa de dominio:

### Product (`domain/models/product.ts`)

```typescript
interface Product {
  id: string;                // UUID
  sku: string;               // Código único del producto (Stock Keeping Unit)
  name: string;              // Nombre del producto
  description?: string;      // Descripción opcional
  category: string;          // Categoría (ej: "Lácteos", "Limpieza", "Bebidas")
  purchase_price: number;    // Precio de compra (lo que pagamos al proveedor)
  sale_price: number;        // Precio de venta (lo que paga el cliente)
  min_stock: number;         // Stock mínimo para alertas
  unit: string;              // Unidad de medida (ej: "unidad", "kg", "litro", "caja")
  image_url?: string;        // URL de la imagen del producto
  is_active: boolean;        // ¿El producto está activo?
  created_at: string;        // Fecha de creación
  updated_at: string;        // Fecha de última modificación
}

// DTOs (Data Transfer Objects) — lo que enviamos al crear/actualizar
interface CreateProductDTO {
  sku: string;
  name: string;
  description?: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  unit: string;
  image_url?: string;
}

interface UpdateProductDTO extends Partial<CreateProductDTO> {}

// Stock de un producto en una sede específica
interface ProductStock {
  product_id: string;
  branch_id: string;
  quantity: number;          // Cantidad actual en esta sede
  branch_name?: string;      // Nombre de la sede (para mostrar)
}
```

### Supplier (`domain/models/supplier.ts`)

```typescript
interface Supplier {
  id: string;
  business_name: string;     // Razón social
  contact_name: string;      // Nombre del contacto
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateSupplierDTO {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
}

// Producto que nos vende un proveedor específico
interface SupplierProduct {
  supplier_id: string;
  product_id: string;
  price: number;             // Precio que nos cobra el proveedor
  lead_time_days?: number;   // Días que tarda en entregar
}

// Orden de compra a un proveedor
interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  branch_id: string;         // Sede que recibe
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}
```

### Branch (`domain/models/branch.ts`)

```typescript
interface Branch {
  id: string;
  name: string;              // Nombre de la sede (ej: "Sucursal Centro")
  address: string;
  phone?: string;
  manager_name?: string;     // Encargado de la sede
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Movement (`domain/models/movement.ts`)

```typescript
type MovementType = 'entry' | 'exit' | 'adjustment' | 'transfer';

interface Movement {
  id: string;
  type: MovementType;
  // entry    = entrada de stock (compra a proveedor)
  // exit     = salida de stock (venta, pérdida, uso interno)
  // adjustment = ajuste por diferencia en inventario físico
  // transfer = transferencia entre sedes

  product_id: string;
  product_name?: string;
  branch_id: string;            // Sede donde ocurre el movimiento
  target_branch_id?: string;    // Sede destino (solo para transferencias)
  quantity: number;             // Cantidad (positiva para entradas, negativa para salidas)
  reason: string;               // Motivo del movimiento
  reference_type?: string;      // Tipo de documento que lo respalda
  reference_id?: string;        // ID del documento (ej: orden de compra)
  performed_by: string;         // ID del usuario que realizó el movimiento
  created_at: string;
}
```

### User (`domain/models/user.ts`)

```typescript
type UserRole = 'super_admin' | 'branch_admin' | 'viewer';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branch_id?: string;          // Sede asignada (null para super_admin)
  is_active: boolean;
  created_at: string;
}

interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthSession {
  user: User;
  access_token: string;
  expires_at: number;
}
```

---

## 🔌 Patrón Repositorio

El **patrón repositorio** es la clave de la arquitectura. Consiste en:

### 1. Definir una **interfaz** (el contrato)

En la capa de dominio, definimos **qué** se puede hacer, sin decir **cómo**:

```typescript
// domain/repositories/IProductRepository.ts
export interface IProductRepository {
  getAll(params?: {
    branchId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Product[]; total: number }>;

  getById(id: string): Promise<Product | null>;

  getStockByBranch(productId: string): Promise<ProductStock[]>;

  create(product: CreateProductDTO): Promise<Product>;
  update(id: string, product: UpdateProductDTO): Promise<Product>;
  delete(id: string): Promise<void>;
}
```

### 2. Implementar la interfaz (el cómo con Supabase)

En la capa de infraestructura, implementamos ese contrato usando Supabase:

```typescript
// infrastructure/supabase/repositories/ProductRepository.ts
import { IProductRepository } from '@/domain/repositories';
import { Product, CreateProductDTO, UpdateProductDTO, ProductStock } from '@/domain/models';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseProductRepository implements IProductRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAll(params?: {
    branchId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    let query = this.supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (params?.category) {
      query = query.eq('category', params.category);
    }

    if (params?.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    if (params?.branchId) {
      // También traemos el stock para esa sede
      query = query.select('*, stock_per_branch!inner(*)')
        .eq('stock_per_branch.branch_id', params.branchId);
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      query = query.range(from, from + params.limit - 1);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      data: data as Product[],
      total: count ?? 0,
    };
  }

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Product;
  }

  async getStockByBranch(productId: string): Promise<ProductStock[]> {
    const { data, error } = await this.supabase
      .from('stock_per_branch')
      .select('*, branches(name)')
      .eq('product_id', productId);

    if (error) throw error;
    return data as ProductStock[];
  }

  async create(product: CreateProductDTO): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async update(id: string, product: UpdateProductDTO): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
```

### 3. Inyectar la implementación (el "conectar" los cables)

```typescript
// application/providers/RepositoryProvider.tsx
import React, { createContext, useContext } from 'react';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository';
import { SupabaseSupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository';
// ... otros imports

interface Repositories {
  products: IProductRepository;
  suppliers: ISupplierRepository;
  branches: IBranchRepository;
  movements: IMovementRepository;
  auth: IAuthRepository;
}

const supabase = createClient();

const repositories: Repositories = {
  products: new SupabaseProductRepository(supabase),
  suppliers: new SupabaseSupplierRepository(supabase),
  branches: new SupabaseBranchRepository(supabase),
  movements: new SupabaseMovementRepository(supabase),
  auth: new SupabaseAuthRepository(supabase),
};

const RepoContext = createContext<Repositories>(repositories);

export function useRepositories() {
  return useContext(RepoContext);
}

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  return (
    <RepoContext.Provider value={repositories}>
      {children}
    </RepoContext.Provider>
  );
}
```

### 4. Consumir desde un hook (el "usar" los datos)

```typescript
// application/hooks/useProducts.ts
import { useRepositories } from '@/application/providers/RepositoryProvider';
import { useProductStore } from '@/application/stores/useProductStore';

export function useProducts() {
  const { products: productRepo } = useRepositories();
  const store = useProductStore();

  const fetchProducts = async (params?: {
    branchId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    store.setLoading(true);
    store.setError(null);

    try {
      const result = await productRepo.getAll(params);
      store.setProducts(result.data);
      store.setTotal(result.total);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      store.setLoading(false);
    }
  };

  const getProduct = async (id: string) => {
    store.setLoading(true);
    try {
      const product = await productRepo.getById(id);
      store.setSelectedProduct(product);
      return product;
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Error al cargar producto');
    } finally {
      store.setLoading(false);
    }
  };

  const createProduct = async (data: CreateProductDTO) => {
    const product = await productRepo.create(data);
    store.addProduct(product);
    return product;
  };

  const updateProduct = async (id: string, data: UpdateProductDTO) => {
    const product = await productRepo.update(id, data);
    store.updateProduct(product);
    return product;
  };

  const deleteProduct = async (id: string) => {
    await productRepo.delete(id);
    store.removeProduct(id);
  };

  return {
    ...store,
    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
```

### 5. Usar desde un componente

```tsx
// presentation/features/products/ProductListPage.tsx
import { useProducts } from '@/application/hooks/useProducts';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { Button } from '@/presentation/components/ui/Button';

export function ProductListPage() {
  const { products, isLoading, fetchProducts } = useProducts();

  useEffect(() => {
    fetchProducts({ branchId: 'sede-actual' });
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Button variant="primary">+ Nuevo Producto</Button>
      </div>

      <DataTable
        columns={[
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'Nombre' },
          { key: 'category', label: 'Categoría' },
          { key: 'sale_price', label: 'Precio', format: 'currency' },
          { key: 'stock', label: 'Stock' },
        ]}
        data={products}
      />
    </div>
  );
}
```

---

## 👥 Autenticación y Roles

### Roles definidos

| Rol                         | Descripción                           | Permisos                                                                     |
| --------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| **Super Admin** 🛡️  | Dueño/gerente general. Acceso a todo. | CRUD todas las entidades, todas las sedes, usuarios, métricas globales      |
| **Admin de Sede** 🏪  | Encargado de una sucursal específica  | CRUD en su sede: productos, inventario, proveedores. Ve métricas de su sede |
| **Visualizador** 👁️ | Solo lectura                           | Dashboard, listas de productos, stock. No puede crear, editar ni eliminar    |

### Flujo de autenticación

1. El usuario ingresa su **email y contraseña** en `LoginPage`
2. `useAuth` llama a `authRepo.login(credentials)`
3. `SupabaseAuthRepository.login()` usa `supabase.auth.signInWithPassword()`
4. Supabase devuelve un **token JWT** y los datos del usuario
5. Guardamos la sesión en `useAuthStore` (Zustand)
6. Redirigimos al Dashboard
7. Si el usuario es super_admin o tiene varias sedes, se le pide **seleccionar una sede activa**
8. El `BranchSelector` en la navbar permite cambiar de sede en cualquier momento

### Protección de rutas

```tsx
// presentation/routes/AppRouter.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />

  {/* Rutas protegidas - cualquier usuario autenticado */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppShell />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/products" element={<ProductListPage />} />

      {/* Solo super_admin puede gestionar sedes */}
      <Route element={<RoleGuard allowedRoles={['super_admin']} />}>
        <Route path="/branches" element={<BranchListPage />} />
        <Route path="/branches/new" element={<BranchFormPage />} />
      </Route>

      {/* super_admin y branch_admin pueden editar inventario */}
      <Route element={<RoleGuard allowedRoles={['super_admin', 'branch_admin']} />}>
        <Route path="/inventory/movements/new" element={<NewMovementPage />} />
      </Route>

      {/* visualizador solo ve, no edita */}
    </Route>
  </Route>
</Routes>
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ (recomendado: 20 LTS)
- npm 9+ o yarn 1.22+
- Una cuenta en [Supabase](https://supabase.com)

### Pasos para levantar el proyecto

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/agabo-frontend.git
cd agabo-frontend

# 2. Instalar dependencias
npm install

# 3. Copiar el archivo de variables de entorno
cp .env.example .env

# 4. Editar .env con tus credenciales de Supabase
#    VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
#    VITE_SUPABASE_ANON_KEY=tu-anon-key

# 5. Iniciar el servidor de desarrollo
npm run dev
```

El proyecto arrancará en `http://localhost:5173` 🎉

### Scripts disponibles

| Comando               | Descripción                                    |
| --------------------- | ----------------------------------------------- |
| `npm run dev`       | Inicia el servidor de desarrollo con hot reload |
| `npm run build`     | Compila el proyecto para producción            |
| `npm run preview`   | Previsualiza la build de producción localmente |
| `npm run lint`      | Ejecuta ESLint para revisar el código          |
| `npm run typecheck` | Verifica tipos de TypeScript (sin compilar)     |

---

## 📐 Convenciones de Código

### Nombres de Archivos

| Tipo          | Convención                                          | Ejemplo                                 |
| ------------- | ---------------------------------------------------- | --------------------------------------- |
| Componentes   | `PascalCase.tsx`                                   | `ProductListPage.tsx`                 |
| Hooks         | `camelCase` con prefijo `use`                    | `useProducts.ts`                      |
| Stores        | `camelCase` con prefijo `use` y sufijo `Store` | `useProductStore.ts`                  |
| Interfaces    | `PascalCase` con prefijo `I` (repositorios)      | `IProductRepository.ts`               |
| Tipos/Modelos | `PascalCase`                                       | `Product.ts`, `CreateProductDTO.ts` |
| Utilidades    | `camelCase`                                        | `format.ts`, `validations.ts`       |

### Principios a Seguir

1. **Una responsabilidad por archivo**: Cada archivo hace una sola cosa
2. **Nombres descriptivos**: `getProductsByBranch` > `getProds`
3. **Sin lógica en componentes**: Los componentes solo renderizan. La lógica va en hooks
4. **Sin Supabase en componentes**: Si ves `supabase` importado en un componente, algo está mal
5. **Tipado explícito**: Siempre definir tipos, evitar `any`
6. **Errores manejados**: Toda llamada a repositorio debe tener try/catch
7. **Estados cubiertos**: Cada componente debe manejar: carga, éxito, vacío y error

### Flujo de trabajo para nuevas features

```
1. Definir el modelo en domain/models/
2. Definir la interfaz del repositorio en domain/repositories/
3. Implementar el repositorio en infrastructure/supabase/repositories/
4. Crear el store Zustand en application/stores/
5. Crear el hook en application/hooks/
6. Crear los componentes UI en presentation/components/ui/ (si faltan)
7. Crear las páginas y componentes del feature en presentation/features/
8. Agregar las rutas en presentation/routes/AppRouter.tsx
```

---

## 🤝 Contribuir

1. Crea una rama desde `main`: `git checkout -b feature/nueva-funcionalidad`
2. Desarrollo y prueba tu cambio
3. Asegúrate de que `npm run lint` y `npm run typecheck` pasen
4. Abre un Pull Request a `main`

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">Hecho con ❤️ para el comercio</p>
