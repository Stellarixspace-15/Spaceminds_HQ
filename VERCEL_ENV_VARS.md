# Vercel Environment Variables — Copy-Paste Guide

Go to: vercel.com → spaceminds-hub → Settings → Environment Variables

Add ALL of these. For each one: paste the Name, paste the Value, select "All Environments", click Save.

---

## 1. NEXT_PUBLIC_SUPABASE_URL
```
https://gkvvzmlpfmrvwhqtstpc.supabase.co
```

## 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ6bWxwZm1ydndocXRzdHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzMzNTgsImV4cCI6MjA5NjgwOTM1OH0.5CB54HB27-ZNOQ9t9U0c23tiWGWyTHyXbOcyhM2McNo
```

## 3. SUPABASE_SERVICE_ROLE_KEY
Get from: supabase.com → Spaceminds_HQ → Settings → API → "service_role" (click reveal)
⚠️ This is the long key starting with eyJ... under "service_role" — NOT the anon key

## 4. GOOGLE_SHEET_ID
Get from your Google Sheet URL (see GOOGLE_SHEETS_SETUP.md)
Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

## 5. GOOGLE_SERVICE_ACCOUNT_EMAIL
```
admin-817@spaceminds.iam.gserviceaccount.com
```

## 6. GOOGLE_PRIVATE_KEY
Paste this EXACTLY as shown (including the quotes):
```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDaOxcD9qepdCo/
XhveI9eF7Dm1NjBkpiM9to3QDm08R05FSyaL/j0q4NipR6Zay8hC2uui4MoPGc2B
WyqVeCiCi6+iHWsENU0/DWyqiBQsXj4g5iuSA3VVC/bGSBGxLIg8w+7TqXSp4yF1
Ic2VAN5j7g2SmzLjlLB4lJIxg/hwuYzreBRWOFn3BOYGwnrhVPzfIUTe69IR5cs7
9YAhVS8YM0M3ry0HGe8Cg/OaOqRMxFQAorNW5H2jLMFXDsiNU8iSTPcHDfNk43hT
Y/vp2EU0CF1kdAnhJfiGvxR/2DAwTBLaTFmbddC+tLueD2gE9P7/JIvvTsg1urdo
MPu9lj2ZAgMBAAECggEAAJpRmBqIOq0of6h864NA80y5IOiDvB5DIU4vwetW3uf1
/PJdk/sfmOVIZc+LD+NSChZp1r7H62X+hj1j9qJhXVMvgyjrs6rVM4bi0bEu8n5t
cZC0BbIVZZ9rg5Xvb8CHHv0GgYlYrQE5WFjd4U3PhChiU9xftf6TLhkljSyy0wO1
Ah51HFwPABhLADt7uERoC35VTU9TYB9oqUbwlkzcjHtMe5iCpxcJ5R73YE7wl/C1
kNfpeupKW4Z+07EWKNSWjRGnizCZI4KCuN0FxOGJlm7BuyrMO1WOdCjkPRQeeisz
LD/JHFCIRkd3KzQncEEzf/V7YUlvI0323AbGR+v5ZwKBgQDyKyDPIiFl0fM5d43w
WEXnvhmVenLRcCdMZ0b3DEZlpxVbd18ktsdmSAGpOFUbR4YQkv7QSKwJWMPS454h
OM2M26HUPn5mLzEgEcgSqbBRCIGmldQqVeaIpyXOV/NiDJ0Ox9PQIY7+1np/oUpr
NEF37ECvbexOuEUADt+z4jLFqwKBgQDmsfT0RjE64lCM/yb3caFg4psrTSAQ17P8
rObLNQgYmwynOXr6h5PQP9d5s0L3HkT+JPfnNaQ/+oLiyj2UsIJIgoMsPLGGfEaA
PPqjI0YHGF1DvvHpQZipNulbqN1SqTw8yvMO2HJRp2Dn0KQi9aVGoQlQasWSBlHs
RGpCQW19ywKBgBeZ0mm9ZsnYiz63gxLAV5e9NBsYQuZcasgMbKMZBCdWAEPYv2IB
mi9Cpz7Jqamt78ffu4uq+XEzwGnmGvwb4BRxNzVLHeBxivUYJoqDFRbgoFoO0g2K
L5xzxcB1W9fbaNcO7HqlOp1lY6zamDkYb6TzVl6CdPw7AyZ9TJnoWpBfAoGAGnwr
xy+Xz07UOJvCeX4OLPVXIy2DlOtuun+PL50zBMAoP7qVp9WQ3sO1lT9DXOOYwCS2
YVEDPmUgSbE2SK/LBVAWhymgp/P0lBxsGfaev4nIi1KMq17gi+zF9cP5RNgxFjmm
lfm7hixVL8gAUBMrmmQ6kYTwkccv+JQSLvEcBOkCgYAUJscaOQ/h4tnE/YWaujWe
Hly84fJkcC7eC5s8tCUU7LzFKOpM/9DmA+kZGbu3fHaNEC6t4P8TtepgbcrAVRhN
32ivYA1SwFDNCxP+C+H0ovpQxik90PzKcJKqFsFa9Xdg249gKUMoNh0umcomLaF0
3qpUDrIQDpiK+ya8YvC0ZA==
-----END PRIVATE KEY-----
```
⚠️ In Vercel, paste the key WITH the BEGIN/END lines, Vercel handles the formatting.

---

After adding all 6 variables → Deployments → Redeploy → your site will work.
