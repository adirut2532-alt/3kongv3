# 3 กอง กาญ — Luxury Thai Pusoy (Chinese Poker)

โปรเจกต์ใหม่แยกจากของเดิม (poker-kan.web.app) — สถาปัตยกรรม **React Native (Expo) + TypeScript + Socket.IO**
ธีมคาสิโนหรู ทอง / เขียวมรกต / ดำ / ไม้เข้ม เล่นแนวตั้งบนมือถือ

## โครงสร้างโปรเจกต์

```
sam-kong-kan/
├── App.tsx                 # entry — สลับหน้าจอตาม phase
├── app.json                # Expo config (ล็อกแนวตั้ง, ธีมมืด)
├── package.json
├── tsconfig.json
├── server/
│   └── index.js            # Socket.IO server (ห้อง, reconnect, spectator)
└── src/
    ├── theme/theme.ts      # ★ design tokens (สี/ระยะ/เงา) — แก้ที่เดียวเปลี่ยนทั้งแอป
    ├── types/game.ts       # type ทั้งหมด
    ├── game/               # ★★ สมองของเกม (pure, ไม่มี UI — เทสได้/แชร์กับ server ได้)
    │   ├── deck.ts         #   สร้าง/สับ/แจกไพ่ 13×4
    │   ├── handEvaluator.ts#   ประเมินไพ่ 3/5 ใบ → คะแนนเทียบกันได้
    │   ├── scoring.ts      #   ตรวจหลังฟาวล์ + คิดแต้ม + เด้ง + ค่าน้ำ + จับ x2
    │   └── autoArrange.ts  #   AI จัดไพ่อัตโนมัติ + AI แนะนำ
    ├── store/gameStore.ts  # Zustand — state กลางทั้งเกม (เล่นกับบอทได้ออฟไลน์)
    ├── net/socket.ts       # client Socket.IO wrapper (reconnect อัตโนมัติ)
    ├── components/         # Card, TopBar, PokerTable, Timer, PrimaryButton, HandRow
    │   ├── DraggableCard.tsx  # ★ ไพ่ที่ลากได้ + ตรวจโซนวาง (reanimated)
    │   ├── DraggableFan.tsx   #   มือไพ่แบบลากได้ (ไม่ใช้ ScrollView)
    │   └── DealAnimation.tsx  # ★ แจกไพ่บินวนทีละใบ
    └── screens/            # GameScreen, ResultScreen
```

## หลักการออกแบบ (แยก logic ออกจาก UI)

`src/game/*` เป็น **pure functions ล้วน ไม่พึ่ง React** ทำให้:
- เทสง่าย (ผ่าน smoke test แล้ว: ลำดับไพ่ถูก, แจกครบ 52 ไม่ซ้ำ, autoArrange จัดถูกกติกา 200/200)
- เอาไป **ใช้ซ้ำบน server ได้** กติกาฝั่ง client/server จึงไม่มีทางเพี้ยนกัน

UI ทุกตัวอ่านสีจาก `theme.ts` อย่างเดียว — ถ้าอยากเปลี่ยนโทน แก้ไฟล์เดียวจบ

## กติกาที่ฝังไว้

- ผู้เล่น 4 คน รับคนละ 13 ใบ จัดเป็น 3 กอง: บน 3 / กลาง 5 / ล่าง 5
- บังคับ **ล่าง ≥ กลาง ≥ บน** ไม่งั้น "หลังฟาวล์" (เสียยกกอง)
- คิดแต้มแบบเทียบทุกคู่ + เด้ง (ตองหัว, ฟูลเฮาส์/โฟร์/สเตรทฟลัชกองกลาง-ล่าง) + จับครบ 3 กอง ×2
- รองรับตัวคูณห้อง (`rateMultiplier`) และหักค่าน้ำ (`rakePercent`) — แก้ใน `scoring.ts` ตรง `BONUS`

> เด้ง/ค่าน้ำตอนนี้ตั้งเป็นค่ามาตรฐานไว้ก่อน ปรับให้ตรงกฎ "3 กอง กาญ" เป๊ะ ๆ ได้ที่ `BONUS` และ `settleTable`

## วิธีทดสอบ

> โปรเจกต์นี้เป็น React Native (Expo SDK 56) — เปิดเป็น URL ใน browser ตรง ๆ ไม่ได้ ต้องรันผ่าน Expo

### ทางที่ 1 — Expo Snack (ทดสอบบน iPhone ได้เลย ไม่ต้องมีคอม) ★ แนะนำ
1. push โฟลเดอร์นี้ขึ้น GitHub
2. เปิด https://snack.expo.dev บนเครื่องไหนก็ได้ → เมนู ⋯ → **Import from GitHub** → วาง URL repo
3. ลง **Expo Go** จาก App Store บน iPhone
4. ใน Snack กด **My Device** แล้วสแกน QR ด้วย Expo Go → เล่นได้ทันที (Snack จัดการเวอร์ชัน lib ให้เอง)

### ทางที่ 2 — บนคอม (Mac/PC ที่มี Node ≥ 20)
```bash
npm install
npx expo install --fix      # ★ ปรับเวอร์ชัน native lib ให้ตรง SDK 56 อัตโนมัติ
npx expo start              # สแกน QR ด้วย Expo Go บน iPhone
```

### สิ่งที่ต้องรู้
- **ไม่ต้องเปิด server** ก็ทดสอบได้ — เกมเล่นกับบอทแบบออฟไลน์ครบทุกฟีเจอร์ (แจกไพ่/ลากไพ่/คิดแต้ม) เปิด `npm run server` เฉพาะตอนจะลองเล่นเรียลไทม์หลายเครื่อง
- ถ้า Expo Go เด้ง error เรื่องเวอร์ชัน reanimated/worklets → รัน `npx expo install --fix` แล้วเปิดใหม่
- ตำแหน่งไพ่บินตอนแจก/โซนวาง drag คำนวณจากขนาดจอจริง อยากจูนปรับเลขใน `dealGeometry()` (GameScreen)

### อยากเช็คเฉพาะ logic (ไม่ต้องรันแอป)
ตัวเกมใน `src/game/*` เป็น pure TS ทดสอบแยกได้ด้วย Node — เช่น compile แล้วเรียก `deal()`, `evaluate5()`, `autoArrange()` ได้ตรง ๆ (ผมทดสอบให้แล้ว: ลำดับไพ่ถูก, แจกครบ 52 ไม่ซ้ำ, autoArrange ถูกกติกา 200/200, ย้ายไพ่ 50,000+ ครั้งไพ่ไม่หาย)

## วิธีรันบน iPhone จากเครื่องเดียว (ทำงานบนมือถือล้วน)
ใช้ **ทางที่ 1 (Expo Snack)** ด้านบน — push ขึ้น GitHub จาก GitHub mobile editor แล้ว import เข้า Snack ทดสอบบนเครื่องตัวเองได้เลย ไม่ต้องมีคอมเครื่องที่สอง

## การโต้ตอบจัดไพ่ (drag-and-drop จริง)

ลากไพ่ด้วย `react-native-gesture-handler` + `reanimated` (ขยับบน UI thread จึงลื่นไม่กระตุก):
- ลากไพ่จากมือ **ขึ้นไปวางในกอง** — ปล่อยตรงโซนไหนลงกองนั้น
- ลาก **กลับลงมาที่มือ** หรือ **สลับไปอีกกอง** ได้
- กองเต็มจะไม่รับ และไพ่ **ดีดกลับที่เดิม** อัตโนมัติ
- ยังแตะเลือก→แตะกองได้เหมือนเดิม (ใช้ action เดียวกัน `moveCard`)

ความเสถียร: จงใจไม่ใช้ ScrollView ในมือไพ่ (scroll ชนกับ pan = ต้นเหตุการกระตุก) ไพ่จึงวางแบบ wrap
และตรวจโซนวางด้วยพิกัดหน้าจอจริง (`measureInWindow`) ทดสอบแล้ว 1000 รอบ/50,000+ การย้าย — ไพ่ครบ 13 ใบเสมอ ไม่ซ้ำ กองไม่ล้น

## อนิเมชันแจกไพ่

เข้าเฟส `dealing` ก่อนเริ่มจัด: ไพ่บินจากกลางโต๊ะไปหา **ทุกคนทีละใบวนรอบโต๊ะ** (52 ใบ)
เร็วประมาณ 2.3 วิ (ปรับที่ `intervalMs`/`flightMs` ใน `DealAnimation`) เสร็จแล้วมือเราค่อยกางออก

## สิ่งที่ทำต่อได้

- ล็อบบี้/ห้องเพื่อน/โต๊ะส่วนตัว (server มี room:create/join พร้อมแล้ว)
- โหมดดู (spectator) — server รองรับแล้ว, เพิ่มหน้าจอฝั่ง client
- แอนิเมชันแจกไพ่/เปิดไพ่/เหรียญ ด้วย reanimated
- ฟอนต์ไทย (Kanit/Prompt) ผ่าน expo-font แล้วตั้งใน `theme.font`
```
