import { PreadmissionStatus } from '../../common/enums';
export declare class CreatePreadmissionDto {
    departamento: string;
    registradoComo: string;
    name1: string;
    name2?: string;
    apellido1: string;
    apellido2?: string;
    pasaporte: string;
    cedula: string;
    sexo: string;
    fechanac: string;
    nacionalidad: string;
    estadocivil: string;
    tiposangre: string;
    email: string;
    celular: string;
    celularPrefix?: string;
    provincia1: string;
    distrito1: string;
    corregimiento1: string;
    direccion1: string;
    encasourgencia: string;
    relacion: string;
    email3: string;
    celular3: string;
    provincia3?: string;
    distrito3?: string;
    corregimiento3?: string;
    direccion3?: string;
    fechaprobableatencion?: string;
    medico?: string;
    doblecobertura: string;
    compania1?: string;
    poliza1?: string;
    diagnostico?: string;
    procedimientoEstudio?: string;
    numerocotizacion?: string;
}
export type CreatePreadmissionBodyDto = CreatePreadmissionDto;
export declare class ParseCedulaQrDto {
    raw: string;
}
export declare class RequestVerificationDto {
    destination: string;
}
export declare class ConfirmVerificationDto {
    destination: string;
    code: string;
}
export declare class ReviewPreadmissionDto {
    status: PreadmissionStatus;
    observaciones?: string;
}
