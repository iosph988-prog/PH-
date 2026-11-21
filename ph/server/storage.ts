// Storage helpers for Railway Object Storage (S3-compatible), with Forge fallback.






import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";


import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


import { ENV } from "./_core/env";






function getS3Config() {
  
  const endpoint = (process.env.AWS_ENDPOINT_URL || process.env.AWS_S3_ENDPOINT || "").trim();
  
  const bucket = (process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "").trim();
  
  const region = (process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || "auto").trim();
  
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || "").trim();
  
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY || "").trim();
  
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  
  return {
    
    bucket,
    
    client: new S3Client({
      
      endpoint,
      
      region,
      
      forcePathStyle: true,
      
      credentials: { accessKeyId, secretAccessKey },
      
    }),
    
  };
  
}






function getForgeConfig() {
  
  const forgeUrl = ENV.forgeApiUrl;
  
  const forgeKey = ENV.forgeApiKey;
  
  if (!forgeUrl || !forgeKey) return null;
  
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
  
}






function normalizeKey(relKey: string): string {
  
  return relKey.replace(/^\/+/, "");
  
