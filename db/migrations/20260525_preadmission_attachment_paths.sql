-- Preadmisión: adjuntos en disco (rutas relativas en BD), no base64 en nuevos envíos.
-- Registros antiguos con base64 en TEXT siguen siendo legibles por el backend (modo legado).
-- No reducir columnas a varchar(512) mientras existan valores base64 > 512 caracteres.

COMMENT ON COLUMN preadmissions."cedulaimagen" IS 'Ruta relativa bajo uploads/preadmissions/{id}/ o base64 legado';
COMMENT ON COLUMN preadmissions."ordenimagen" IS 'Ruta relativa o base64 legado';
COMMENT ON COLUMN preadmissions."preautorizacion" IS 'Ruta relativa o base64 legado';
COMMENT ON COLUMN preadmissions."carnetseguro" IS 'Ruta relativa o base64 legado';
COMMENT ON COLUMN preadmissions."certificadoSeguro" IS 'Ruta relativa o base64 legado';
COMMENT ON COLUMN preadmissions."ssimagen" IS 'Ruta relativa o base64 legado';
