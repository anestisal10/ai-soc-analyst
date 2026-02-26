import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        # Test 1: text payload
        print("Testing text payload...")
        resp = await client.post("http://localhost:8000/api/analyze", data={"text": "From: attacker@bad.com\nTo: victim@company.com\nSubject: Update your billing\n\nPlease login here: http://secure-billing-update.xyz"})
        print(f"Status: {resp.status_code}")
        
        # Test 2: large file payload
        print("Testing large file payload...")
        large_data = b"0" * (11 * 1024 * 1024) # 11 MB
        files = {'file': ('large.eml', large_data, 'message/rfc822')}
        resp2 = await client.post("http://localhost:8000/api/analyze", files=files)
        print(f"Status: {resp2.status_code}")
        print(resp2.text)

if __name__ == "__main__":
    asyncio.run(main())
