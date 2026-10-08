export interface User{
    id:number | string;
    name:string;
    email:string;
    role_type:UserRole;
}


export enum UserRole {
    SUPERADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    MANAGER = 'ROLE_MANAGER',
    PARTNER = 'SUPPORT_PARTNER',
    ISV = 'ISV',
    M_SELLER = 'M_SELLER',
    ISV_SELLER = 'ISV_SELLER',
    SELLER = 'SELLER',
    AGENT = 'AGENT',
    A_MANAGER = 'A_MANAGER',
    MARKETING = 'MARKETING',
}

export const CRM_ROLES: string[] = [
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.AGENT,
    UserRole.A_MANAGER,
    UserRole.M_SELLER,
    UserRole.ISV_SELLER,
    UserRole.SELLER,
    UserRole.ISV,
    UserRole.PARTNER,
];
