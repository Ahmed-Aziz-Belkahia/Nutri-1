# NutriAI - Optymalizacje WebView

## Wprowadzone optymalizacje

### 1. Optymalizacje logowania (`[object Object]`)

- Zaimplementowano narzędzie do formatowania objektów JSON w `webviewOptimizations.ts`
- Zastosowano `JSON.stringify()` do logowanych obiektów
- Dodano wsparcie dla komunikacji z mostem JavaScriptowym w Android WebView
- Nadpisano metody `console.log`, `console.error` i inne, aby poprawnie formatować obiekty

### 2. Optymalizacje wydajności WebView

- Zmniejszono rozdzielczość kamery (640x480 zamiast 1280x720)
- Zmniejszono częstotliwość odświeżania (15 fps zamiast 30 fps)
- Dodano debouncing dla zdarzeń scrolla
- Zastosowano lazy loading dla obrazów
- Dodano mechanizm automatycznych spadków jakości dla urządzeń o niższej wydajności
- Optymalizowano animacje (mniejsza złożoność, krótszy czas trwania)
- Użyto transformacji sprzętowych (hardware acceleration)

### 3. Optymalizacja kamery i skanera

- Dodano mechanizm automatycznego obniżania parametrów kamery w przypadku błędów
- Zastosowano retry z progresywnie niższymi ustawieniami kamery
- Optymalizowano kod skanera kodów kreskowych (mniejsze użycie CPU)
- Dodano lepsze zarządzanie cyklem życia zasobów kamery
- Wyłączono wygładzanie obrazu dla lepszego rozpoznawania kodów kreskowych

### 4. Unikanie ostrzeżeń refleksji i greylisting

- Użyto nowszych API zamiast przestarzałych metod
- Zastosowano bezpieczne wzorce dostępu do API, które mogą być niedostępne
- Dodano sprawdzanie dostępności funkcji przed ich użyciem

## Instrukcje implementacji

### Android

1. Użyj kodu z pliku `WebViewOptimizationGuide.md` jako bazy do zoptymalizowanej aktywności WebView
2. Dodaj odpowiednie uprawnienia w AndroidManifest.xml
3. Włącz hardware acceleration zarówno na poziomie aplikacji jak i WebView
4. Zaimplementuj odpowiednie obsługiwanie uprawnień dla kamery

### Web App (już zaimplementowane)

1. Dodano `webviewOptimizations.ts` z funkcjami optymalizacyjnymi
2. Zintegrowano optymalizacje w `App.tsx`
3. Ulepszono komponenty skanera (`BarcodeScanner.tsx`, `LiveBarcodeScanner.tsx`)
4. Poprawiono formatowanie JSON w `androidBridge.ts`

## Wskazówki debugowania

### Logi

Zamiast:
```javascript
console.log(obj);  // [object Object]
```

Używaj:
```javascript
console.log(JSON.stringify(obj, null, 2));  // Ładnie sformatowany JSON
```

### Kamera

W przypadku problemów z kamerą w WebView, sprawdź:
1. Czy uprawnienia są poprawnie udzielone
2. Czy używasz sensownych rozdzielczości (niższych dla słabszych urządzeń)
3. Czy WebView ma włączoną obsługę kamery na poziomie manifestu

### Wydajność

1. Używaj hardware acceleration
2. Mniejsze rozdzielczości kamery
3. Redukuj złożoność animacji
4. Używaj debounce dla zdarzeń scrolla
5. Optymalizuj częstotliwość skanowania kodów kreskowych

## Testowanie

Zanim wypuścisz aktualizację, przetestuj aplikację na różnych urządzeniach Android, szczególnie:
1. Starsze urządzenia z wolniejszymi procesorami
2. Urządzenia z różnymi wersjami Androida
3. Urządzenia z różnymi rozdzielczościami ekranu
4. Urządzenia z różnymi aparatami (sprawdź, czy skanowanie działa)