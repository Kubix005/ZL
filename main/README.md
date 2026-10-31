# Zwariowana Lista
Zwariowana Lista

## Struktura list

Strona główna `index.html` prowadzi do dwóch niezależnych list:

- ZLL: `lists/zll/index.html`, z levelami z `lists/zll/levels.json`.
- Zwariowany Challenge List: `lists/challenge/index.html`, z wyzwaniami z `lists/challenge/levels.json`.

Obie strony list korzystają ze wspólnego układu, arkuszy w `assets/css/` i skryptu `assets/js/list-page.js`; ustawienia źródeł leveli i ukończeń są podane jako atrybuty `data-*` na `<body>`. W obu plikach JSON kolejność elementów wyznacza miejsce na liście. Challenge List może mieć maksymalnie 150 aktywnych wyzwań. Jej punkty są liczone tą samą krzywą co ZLL, ale osobno według rankingu Challenge; wyniki i ukończenia Challenge nie zmieniają punktów ZLL.

Dane graczy są rozdzielone: graczy ZLL i ich ukończenia zapisuj w `players.json`, a graczy ZCL i ich ukończenia w `challenge-players.json`. Wartością pola ukończeń może być nazwa lub ID levela/wyzwania. Wpis gracza ZLL ma format:

```json
{
  "Player": "NazwaGracza",
  "Demons": ["Level z ZLL"]
}
```

Wpis gracza ZCL ma format:

```json
{
  "Player": "NazwaGracza",
  "ChallengeDemons": ["Nazwa wyzwania"],
  "Verified": ["Nazwa zweryfikowanego wyzwania"],
  "Built": ["Nazwa zbudowanego wyzwania"]
}
```

`Verified` i `Built` są listami nazw wyzwań przypisanych danemu graczowi; jeśli gracz nie ma jeszcze takich wpisów, użyj pustej tablicy. Gdy nazwa wyzwania istnieje na ZCL, karta wyzwania pokazuje graczy z pól `Verified` („Zweryfikowane przez”) i `Built` („Zbudowane przez”). Wyzwanie z `Verified` liczy się jako completion w ZCL, tak samo jak wpis w `ChallengeDemons`; to samo wyzwanie zapisane w obu polach liczy się tylko raz. `Built` nie wpływa na ukończenia ani punkty.

Podstrony rankingu, ostatnich ukończeń, zwycięzców i porównania wybierają odpowiedni plik graczy i zestaw ukończeń. Linki otwierane z ZCL przekazują `?list=zcl`, dzięki czemu korzystają z `lists/challenge/levels.json` i `challenge-players.json`; bez tego parametru wyświetlane są dane ZLL z `lists/zll/levels.json` i `players.json`.

Linki do filmów z ukończeń ZCL zapisuj w `links.json`. Każdy wpis łączy nazwę gracza, listę ID wyzwań z `lists/challenge/levels.json` pokazanych w filmie i adres tego filmu:

```json
[
  {
    "player": "Kicek1146",
    "levelId": ["148430500", "145484484"],
    "videoUrl": "https://www.youtube.com/watch?v=ID_FILMU"
  }
]
```

W rankingu ZCL kafelek ukończonego wyzwania staje się linkiem do filmu, jeśli istnieje pasujący wpis dla gracza i ID wyzwania. Jeden film może mieć kilka ID w `levelId`; każdy z tych kafelków otworzy to samo wideo. Link otwiera się w nowej karcie. Jeśli dla wyzwania jest osobny film, dodaj dla niego osobny obiekt. Dla zachowania zgodności nadal akceptowane jest pojedyncze ID jako tekst; przy braku linków plik może zawierać pustą tablicę `[]`.

Zakładka „Nowe Levele!” pokazuje aktywne levele dodane w ciągu ostatnich 7 dni. Przy dodawaniu wpisu do odpowiedniego `levels.json` ustaw pole `AddedAt` na datę w formacie `YYYY-MM-DD`; starsze wpisy bez tej daty nie pojawią się w zakładce. Pole `addedAt` jest także obsługiwane dla zgodności. W szczegółach gracza w leaderboardzie ukończone levele z tej zakładki mają oznaczenie `NEW` obok miejsca na liście.

Zakładka „Autorzy” grupuje aktywne levele według pola `Autor` w odpowiednim `levels.json`. Wpisz nazwę autora jako tekst, np. `"Autor": "Sevvend"`. Jeśli przy levelu nie ma autora, wpis nie pojawi się w tej zakładce.

Wspólne arkusze i skrypty są w `assets/css/` i `assets/js/`. Widoki list znajdują się w osobnych katalogach `lists/zll/` i `lists/challenge/`.

## Punktacja

Punktacja opada po krzywej: TOP 1 daje 350 ZLP, TOP 2 około 326 ZLP, TOP 3 około 312 ZLP, TOP 50 daje 50 ZLP, a TOP 150 daje 1 ZLP. Wynik jest zaokrąglany do pełnych punktów ZLP; osobnej premii dla TOP 30–50 nie ma.

## Legacy levele

Aby ukryć level z widocznych list, dodaj do jego wpisu w `levels.json` pole `"legacy": "true"`. Wpis pozostanie w pliku, ale nie będzie wyświetlany ani uwzględniany w aktywnych punktach ZLP. Pole może też mieć wartość logiczną `true`.

## Progres graczy

Plik `progress.json` przechowuje ozdobne informacje o postępie graczy na levelach, które są już na naszej liście i nie zostały przez nich ukończone. Wpisy są wyświetlane na stronie `progress.html`. Progres publikujemy dopiero od 50% na levelu i nie daje on punktów ZLP. Po dodaniu levela do `Demons` gracza w `players.json`, jego progres dla tego levela nie jest wyświetlany.

`progress.json` zawiera tablicę wpisów w formacie. W pliku znajdują się przykładowe wpisy testowe — zastąp je prawdziwymi danymi albo usuń przed publikacją. JSON nie obsługuje komentarzy, dlatego przykłady są oznaczone nazwami graczy:

```json
[
  {
    "level-name": "Atomic cannon",
    "level-id": "77681476",
    "player": "NazwaGracza",
    "opponent": "NazwaRywala",
    "procent": 71
  }
]
```

`procent` może być liczbą od 0 do 100 (także tekstem, np. `"71"`), zakresem w formacie `"72-100"` albo tablicą takich wartości, np. `["71", "71-100"]`. Zakres oznacza, że pasek zaznaczy odcinek od 72% do 100% i odwróci jego gradient, a tablica łączy podane odcinki na jednym pasku. Używaj ID z `levels.json` w polu `level-id`.

Pole `opponent` jest opcjonalne. Podaj w nim dokładną nazwę gracza z `players.json`, aby na stronie `progress.html` wyświetlić najkrótszą ścieżkę leveli do dogonienia go punktami ZLP. Propozycja uwzględnia maksymalnie trzy levele oraz punkty leveli z aktywnej listy.

```json
"procent": ["71", "71-100"]
```

## Predykcja levela

Strona `prediction.html` przyjmuje numeryczne ID levela z adresu AREDL i sprawdza jego aktualną pozycję na głównej liście AREDL. Na tej podstawie przewiduje miejsce levela w ZLL oraz punkty ZLP według aktualnego wzoru punktacji. To szacunek oparty na rankingu AREDL, nie ręczna ocena trudności ZLL.
