# Rollback — transferencia secuencial Lab+Rad

**Fecha del cambio:** 2026-09-21  
**Tag git (estado *antes* del cambio):** `pre-sequential-lab-rad-transfer`

## Flujo operativo (cliente)

1. Anfitrión genera turno → espera Ventanilla  
2. Llamado + Iniciar atención en Ventanilla  
3. **Transferir → Lab + Rad** (mismo número; va a Toma; sin clonar)  
4–5. Llamado / atención en Toma de muestra  
6. **Finalizar** → pop-up obligatorio «Debe transferir a Radiología» **solo** si venía de Lab+Rad; si no, finaliza directo.

Flag y tag de rollback: ver abajo.

## Rollback rápido (sin git)

En el servidor, editar `backend/src/tickets/tickets.service.ts`:

```ts
const SEQUENTIAL_LAB_RAD_TRANSFER = false; // restaura clonado BOTH
```

Luego:

```bash
cd /opt/hospitalsantafe
sudo -u hospitalsantafe npm run backend:build
sudo systemctl restart hospitalsantafe-api
# Si también revierten UI del pop-up, rebuild web o checkout archivos staff
```

## Rollback completo (git)

```bash
cd /opt/hospitalsantafe
git fetch --tags
# Restaurar solo archivos de este feature desde el tag:
git checkout pre-sequential-lab-rad-transfer -- \
  backend/src/tickets/tickets.service.ts \
  backend/src/tickets/dto/ticket.dto.ts \
  app/staff/page.tsx
# (y borrar este doc si aplica)
sudo -u hospitalsantafe npm run backend:build
sudo -u hospitalsantafe npm run build
sudo systemctl restart hospitalsantafe-api hospitalsantafe-web
```

O volver todo el árbol al tag (destructivo respecto a commits posteriores):

```bash
git checkout pre-sequential-lab-rad-transfer
# o: git revert <commit-del-feature>
```

## Marcador en notes

Tickets en secuencia llevan en `notes`:

```text
[HSF_PENDING_STAGE:RAD]
```

(o `LAB` si el orden fuera al revés). Seguro ignorarlo en reportes; es metadato operativo.
