-- Matriz de roles para permisos finos (Nest + TypeORM entity AdminRoleMatrixRow).
-- Si la tabla no existe, GET /api/admin/role-permissions fallará con error de base de datos.
CREATE TABLE IF NOT EXISTS admin_role_matrix_rows (
  role TEXT PRIMARY KEY,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);
