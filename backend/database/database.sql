-- ========================================================
-- PROTEC - Script completo de base de datos (MySQL 5.7+ / MariaDB 10.4+)
-- Uso:  mysql -u root -p < backend/database/database.sql
-- (equivale a: npm run db:init, que aplica schema.sql y las migraciones)
-- ========================================================

CREATE DATABASE IF NOT EXISTS protec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE protec;

-- ========================================================
-- PROTEC · Esquema completo (Prompt 1 + 2 + 3)
-- ========================================================
-- Compatible con MySQL 5.7+ y MariaDB 10.4+
-- Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
-- ========================================================

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(80)  NOT NULL,
  apellidos        VARCHAR(120) NOT NULL,
  correo           VARCHAR(160) NOT NULL,
  telefono         VARCHAR(20)  NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  rol              ENUM('usuario','tecnico','admin') NOT NULL DEFAULT 'usuario',
  estado           BOOLEAN      NOT NULL DEFAULT TRUE,
  token_version    INT UNSIGNED NOT NULL DEFAULT 0,
  correo_verificado BOOLEAN     NOT NULL DEFAULT FALSE,
  acepto_terminos_en DATETIME   NULL,
  fecha_registro   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1c. Verificación de correo al registrarse (solo se guarda el hash del token)
CREATE TABLE IF NOT EXISTS verificaciones_correo (
  id_verificacion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT UNSIGNED NOT NULL,
  token_hash      CHAR(64)     NOT NULL,
  expira          DATETIME     NOT NULL,
  usado_en        DATETIME     NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_verificacion_token (token_hash),
  INDEX idx_verificacion_usuario (id_usuario),
  CONSTRAINT fk_verificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1b. Recuperación de contraseña (solo se guarda el hash SHA-256 del token)
CREATE TABLE IF NOT EXISTS password_resets (
  id_reset        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT UNSIGNED NOT NULL,
  token_hash      CHAR(64)     NOT NULL,
  expira          DATETIME     NOT NULL,
  usado_en        DATETIME     NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reset_token (token_hash),
  INDEX idx_reset_usuario (id_usuario),
  CONSTRAINT fk_reset_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Técnicos (perfil extendido vinculado a usuarios)
CREATE TABLE IF NOT EXISTS tecnicos (
  id_tecnico           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario           INT UNSIGNED NOT NULL,
  especialidad         ENUM('celulares','laptops','computadoras','laptops_computadoras','general') NOT NULL DEFAULT 'general',
  disponible           BOOLEAN        NOT NULL DEFAULT TRUE,
  calificacion         DECIMAL(3,2)   NOT NULL DEFAULT 5.00,
  servicios_terminados INT UNSIGNED   NOT NULL DEFAULT 0,
  estado               BOOLEAN        NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_tecnico_usuario (id_usuario),
  CONSTRAINT fk_tecnicos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Dispositivos
CREATE TABLE IF NOT EXISTS dispositivos (
  id_dispositivo   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario       INT UNSIGNED NOT NULL,
  tipo             ENUM('celular','laptop','computadora') NOT NULL,
  marca            VARCHAR(60)  NOT NULL,
  modelo           VARCHAR(80)  NOT NULL,
  numero_serie     VARCHAR(60)  NULL,
  fecha_registro   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispositivos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Secuencia de folios (atómica)
CREATE TABLE IF NOT EXISTS folio_secuencias (
  anio    SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
  ultimo  INT UNSIGNED      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Solicitudes de reparación
CREATE TABLE IF NOT EXISTS solicitudes (
  id_solicitud          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folio                 VARCHAR(20)   NOT NULL,
  id_usuario            INT UNSIGNED  NOT NULL,
  id_dispositivo        INT UNSIGNED  NOT NULL,
  descripcion_problema  TEXT          NOT NULL,
  categoria             VARCHAR(40)   NULL,
  estado                VARCHAR(40)   NOT NULL DEFAULT 'Solicitud registrada',
  prioridad             ENUM('baja','media','alta') NULL,
  diagnostico_inicial   TEXT          NULL,
  requiere_tecnico      BOOLEAN       NOT NULL DEFAULT FALSE,
  id_tecnico            INT UNSIGNED  NULL,
  costo_estimado        DECIMAL(10,2) NULL,
  metodo_contacto       ENUM('chat','llamada') NOT NULL DEFAULT 'chat',
  solicita_recoleccion  BOOLEAN       NOT NULL DEFAULT FALSE,
  resumen_reparacion    TEXT          NULL,
  diagnostico_final     TEXT          NULL,
  tiempo_estimado       VARCHAR(60)   NULL,
  metodo_entrega        ENUM('recoger','domicilio') NULL,
  fecha_finalizacion    DATETIME      NULL,
  fecha_creacion        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_folio (folio),
  INDEX idx_solicitudes_usuario (id_usuario),
  INDEX idx_solicitudes_tecnico (id_tecnico),
  INDEX idx_solicitudes_estado  (estado),
  CONSTRAINT fk_solicitudes_usuario  FOREIGN KEY (id_usuario)     REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_solicitudes_dispositivo FOREIGN KEY (id_dispositivo) REFERENCES dispositivos (id_dispositivo) ON DELETE RESTRICT,
  CONSTRAINT fk_solicitudes_tecnico  FOREIGN KEY (id_tecnico)     REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Evidencias (fotografías)
CREATE TABLE IF NOT EXISTS evidencias (
  id_evidencia          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud          INT UNSIGNED  NOT NULL,
  url_imagen            VARCHAR(500)  NOT NULL,
  public_id_cloudinary  VARCHAR(255)  NOT NULL,
  descripcion           VARCHAR(255)  NULL,
  tipo_evidencia        ENUM('inicial','diagnostico','reparacion','pieza','final') NOT NULL DEFAULT 'inicial',
  id_autor              INT UNSIGNED  NULL,
  fecha_subida          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evidencias_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE,
  CONSTRAINT fk_evidencias_autor FOREIGN KEY (id_autor) REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Diagnósticos (chatbot + técnico)
CREATE TABLE IF NOT EXISTS diagnosticos (
  id_diagnostico      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud        INT UNSIGNED NOT NULL,
  tipo                ENUM('chatbot','tecnico') NOT NULL,
  resultado           TEXT         NOT NULL,
  detalle             LONGTEXT     NULL,
  fecha_diagnostico   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_diagnosticos_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Historial de estados
CREATE TABLE IF NOT EXISTS historial_estados (
  id_historial   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud   INT UNSIGNED NOT NULL,
  estado         VARCHAR(40)  NOT NULL,
  descripcion    VARCHAR(500) NULL,
  fecha          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_historial_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id_presupuesto     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud       INT UNSIGNED   NOT NULL,
  diagnostico        TEXT           NOT NULL,
  mano_obra          DECIMAL(10,2)  NOT NULL DEFAULT 0,
  costo_piezas       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  costo_total        DECIMAL(10,2)  NOT NULL DEFAULT 0,
  anticipo_requerido DECIMAL(10,2)  NOT NULL DEFAULT 0,
  tiempo_estimado    VARCHAR(60)    NULL,
  estado             ENUM('Pendiente','Aceptado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  fecha_creacion     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_presupuestos_solicitud (id_solicitud),
  CONSTRAINT fk_presupuestos_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Pagos
CREATE TABLE IF NOT EXISTS pagos (
  id_pago       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud  INT UNSIGNED     NOT NULL,
  tipo          ENUM('anticipo','pago_final') NOT NULL,
  monto         DECIMAL(10,2)    NOT NULL,
  estado        ENUM('pendiente','pagado','cancelado') NOT NULL DEFAULT 'pendiente',
  metodo        ENUM('Tarjeta','Transferencia','Efectivo') NOT NULL,
  referencia    VARCHAR(120)     NULL,
  stripe_session_id VARCHAR(255) NULL,
  registrado_por INT UNSIGNED    NULL,
  fecha         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pagos_stripe (stripe_session_id),
  INDEX idx_pagos_solicitud (id_solicitud),
  CONSTRAINT fk_pagos_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE,
  CONSTRAINT fk_pagos_registrado_por FOREIGN KEY (registrado_por) REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Logística (recolección y entrega)
CREATE TABLE IF NOT EXISTS logistica (
  id_logistica     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud     INT UNSIGNED  NOT NULL,
  tipo             ENUM('recoleccion','entrega') NOT NULL,
  direccion        VARCHAR(300)  NOT NULL,
  referencias      VARCHAR(255)  NULL,
  horario          VARCHAR(60)   NULL,
  fecha_programada DATE          NULL,
  fecha_real       DATETIME      NULL,
  estado           VARCHAR(40)   NOT NULL DEFAULT 'Pendiente',
  observaciones    VARCHAR(500)  NULL,
  INDEX idx_logistica_solicitud (id_solicitud),
  CONSTRAINT fk_logistica_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Conversaciones (chat usuario-técnico)
CREATE TABLE IF NOT EXISTS conversaciones (
  id_conversacion  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud     INT UNSIGNED NOT NULL,
  fecha_creacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversacion_solicitud (id_solicitud),
  CONSTRAINT fk_conversaciones_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Mensajes
CREATE TABLE IF NOT EXISTS mensajes (
  id_mensaje       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_conversacion  INT UNSIGNED NOT NULL,
  id_remitente     INT UNSIGNED NULL,
  mensaje          TEXT         NOT NULL,
  fecha_envio      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  leido            BOOLEAN      NOT NULL DEFAULT FALSE,
  INDEX idx_mensajes_conversacion (id_conversacion),
  CONSTRAINT fk_mensajes_conversacion FOREIGN KEY (id_conversacion) REFERENCES conversaciones (id_conversacion) ON DELETE CASCADE,
  CONSTRAINT fk_mensajes_remitente FOREIGN KEY (id_remitente) REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario       INT UNSIGNED  NOT NULL,
  id_solicitud     INT UNSIGNED  NULL,
  tipo             ENUM('estado','mensaje','presupuesto','pago','logistica','reparacion','sistema') NOT NULL DEFAULT 'sistema',
  titulo           VARCHAR(160)  NOT NULL,
  mensaje          VARCHAR(500)  NOT NULL,
  leida            BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notificaciones_usuario (id_usuario),
  INDEX idx_notificaciones_leida  (id_usuario, leida),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Piezas utilizadas
CREATE TABLE IF NOT EXISTS piezas (
  id_pieza        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud    INT UNSIGNED   NOT NULL,
  nombre          VARCHAR(120)   NOT NULL,
  marca           VARCHAR(80)    NULL,
  numero_serie    VARCHAR(80)    NULL,
  codigo_qr       VARCHAR(120)   NULL,
  costo           DECIMAL(10,2)  NOT NULL DEFAULT 0,
  tipo            ENUM('original','compatible','otro') NOT NULL DEFAULT 'original',
  verificada      BOOLEAN        NOT NULL DEFAULT TRUE,
  fecha_registro  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_piezas_solicitud (id_solicitud),
  CONSTRAINT fk_piezas_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Calificaciones
CREATE TABLE IF NOT EXISTS calificaciones (
  id_calificacion  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_solicitud     INT UNSIGNED    NOT NULL,
  id_usuario       INT UNSIGNED    NOT NULL,
  id_tecnico       INT UNSIGNED    NULL,
  puntuacion       TINYINT UNSIGNED NOT NULL,
  comentario       VARCHAR(500)    NULL,
  fecha            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_calificacion_solicitud (id_solicitud),
  CONSTRAINT fk_calificaciones_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitudes (id_solicitud) ON DELETE CASCADE,
  CONSTRAINT fk_calificaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_calificaciones_tecnico FOREIGN KEY (id_tecnico) REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
