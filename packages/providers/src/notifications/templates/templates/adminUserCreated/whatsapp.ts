import { AdminUserCreatedPayloadType } from '@fundifyhub/types';

interface AdminUserCreatedWhatsAppProps {
  customerName: string;
  tempPassword: string;
  loginUrl: string;
  companyName: string;
  createdByAdmin: string;
  assignedRoles: string[];
  assignedDistricts: string[];
}

export const renderAdminUserCreatedWhatsApp = (vars: AdminUserCreatedPayloadType) => {
  const props: AdminUserCreatedWhatsAppProps = {
    customerName: vars.customerName,
    tempPassword: vars.tempPassword,
    loginUrl: vars.loginUrl,
    companyName: vars.companyName,
    createdByAdmin: vars.createdByAdmin,
    assignedRoles: vars.assignedRoles,
    assignedDistricts: vars.assignedDistricts,
  };

  const roleText = props.assignedRoles.length > 0 
    ? `\n• *Roles:* ${props.assignedRoles.join(', ')}`
    : '';
  
  const districtText = props.assignedDistricts.length > 0 
    ? `\n• *Districts:* ${props.assignedDistricts.join(', ')}`
    : '';

  return `🎉 *Welcome to ${props.companyName}!*

Hi ${props.customerName},

An account has been created for you by ${props.createdByAdmin}.

📋 *Your Login Details:*
Temporary Password: *${props.tempPassword}*
${roleText}${districtText}

🔗 Login here: ${props.loginUrl}

⚠️ *Important:* Please change your password after your first login for security.

Need help? Contact our support team.`;
};

export default renderAdminUserCreatedWhatsApp;
