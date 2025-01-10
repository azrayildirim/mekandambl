# Mekanda App - Proje Yapısı

## Ana Dizin
- `App.tsx` - Ana uygulama bileşeni
- `app.json` - Expo yapılandırması

## Bileşenler (/components)
- `CustomAlert.tsx` - Özel alert bileşeni
- `ThemedText.tsx` - Temalı metin bileşeni
- `ThemedView.tsx` - Temalı görünüm bileşeni
- `/ui`
  - `GradientButton.tsx` - Gradyan buton bileşeni

## Ekranlar (/screens)
- `AddPlaceScreen.tsx` - Mekan ekleme ekranı
- `ChatRoomScreen.tsx` - Sohbet odası ekranı
- `HomeScreen.tsx` - Ana sayfa
- `LoginScreen.tsx` - Giriş ekranı
- `MessagesScreen.tsx` - Mesajlar ekranı
- `NearbyPlaces.tsx` - Yakındaki mekanlar ekranı
- `NotificationsScreen.tsx` - Bildirimler ekranı
- `PlaceDetailsScreen.tsx` - Mekan detay ekranı
- `ProfileScreen.tsx` - Profil ekranı
- `SignInScreen.tsx` - Giriş ekranı
- `SignUpScreen.tsx` - Kayıt ekranı
- `UserProfileScreen.tsx` - Kullanıcı profili ekranı

## Servisler (/services)
- `friendshipService.ts` - Arkadaşlık işlemleri
- `messageService.ts` - Mesajlaşma işlemleri
- `notificationService.ts` - Bildirim işlemleri
- `placesService.ts` - Mekan işlemleri
- `presenceService.ts` - Kullanıcı varlık durumu
- `storageService.ts` - Depolama işlemleri
- `userService.ts` - Kullanıcı işlemleri

## Navigasyon (/navigation)
- `AppNavigator.tsx` - Uygulama navigasyonu

## Tipler (/types)
- `index.ts` - Genel tipler
- `navigation.ts` - Navigasyon tipleri

## Firebase Yapılandırması
- `/config`
  - `firebase.ts` - Firebase yapılandırması
- `database.rules.json` - Realtime Database kuralları
- `firebase/firestore.rules` - Firestore kuralları

## Varlıklar (/assets)
- `/images`
  - `default-avatar.png`
  - `splash-icon.png`
  - `adaptive-icon.png`
  - `icon.png`
  - `favicon.png`

## Özellikler
- TypeScript ile tip güvenliği
- Firebase Authentication
- Realtime Database & Firestore
- Expo Location
- React Navigation
- Gerçek zamanlı mesajlaşma
- Bildirim sistemi
- Mekan teyit sistemi
- Arkadaşlık sistemi 