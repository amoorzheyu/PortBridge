import { z } from 'zod';

export const idSchema = z.object({
  id: z.string().min(1)
});

export const listByGroupSchema = z.object({
  groupId: z.string().min(1)
});

export const listByServerSchema = z.object({
  serverId: z.string().min(1)
});

export const portSchema = z.number().int().min(1, '端口必须是 1-65535').max(65535, '端口必须是 1-65535');

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, '名称不能为空')
});

export const updateGroupSchema = createGroupSchema.extend({
  id: z.string().min(1)
});

const serverBaseSchema = z.object({
  groupId: z.string().min(1, '请选择分组'),
  name: z.string().trim().min(1, '服务器名称不能为空'),
  host: z.string().trim().min(1, 'Host 不能为空'),
  port: portSchema.default(22),
  username: z.string().trim().min(1, '用户名不能为空'),
  authType: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  privateKeyPath: z.string().optional(),
  privateKeyPassphrase: z.string().optional(),
  autoReconnect: z.boolean().default(true),
  reconnectInterval: z.number().int().min(1000).default(3000)
});

function validateServerAuth(value: z.infer<typeof serverBaseSchema>, ctx: z.RefinementCtx): void {
  if (value.authType === 'password' && !value.password?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: '密码不能为空' });
  }
  if (value.authType === 'privateKey' && !value.privateKeyPath?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['privateKeyPath'], message: '私钥路径不能为空' });
  }
}

export const createServerSchema = serverBaseSchema.superRefine(validateServerAuth);

export const updateServerSchema = serverBaseSchema
  .extend({
    id: z.string().min(1)
  })
  .superRefine(validateServerAuth);

export const createTunnelSchema = z.object({
  serverId: z.string().min(1, '请选择服务器'),
  name: z.string().trim().min(1, '规则名称不能为空'),
  localHost: z.string().trim().min(1, '本地监听地址不能为空').default('127.0.0.1'),
  localPort: portSchema,
  remoteHost: z.string().trim().min(1, '远程目标地址不能为空').default('127.0.0.1'),
  remotePort: portSchema,
  autoStart: z.boolean().default(false)
});

export const updateTunnelSchema = createTunnelSchema.extend({
  id: z.string().min(1)
});

export const checkPortSchema = z.object({
  host: z.string().min(1),
  port: portSchema
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type CreateServerInput = z.infer<typeof createServerSchema>;
export type UpdateServerInput = z.infer<typeof updateServerSchema>;
export type CreateTunnelInput = z.infer<typeof createTunnelSchema>;
export type UpdateTunnelInput = z.infer<typeof updateTunnelSchema>;
