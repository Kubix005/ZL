# Zwariowana Lista
Zwariowana Lista

## Struktura list

Strona główna `index.html` prowadzi do dwóch niezależnych list:

- ZLL: `lists/zll/index.html`, z levelami z `lists/zll/levels.json`.
- Zwariowany Challenge List: `lists/challenge/index.html`, z wyzwaniami z `lists/challenge/levels.json`.
- `changelog.html` opisuje aktualizacje i ich wpływ na listy oraz rankingi. Historia wydań jest uzupełniana ręcznie, a changelog leveli grupuje aktywne levele z polem `AddedAt` lub `addedAt` w osobne wpisy według daty dodania, pokazując ich aktualną pozycję i punkty.

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

Opcjonalnie level ZCL może mieć tagi w polu `Tag`, zapisane jako tablica tekstów, np. `"Tag": ["Ship", "Cube", "Ball", "Learny"]`. Tagi można wyszukiwać w globalnej wyszukiwarce; na kartach ZCL są wyświetlane pod nazwą levelu na żółto. Leaderboard pokazuje przy graczu trzy tagi występujące najczęściej w ukończonych levelach.

`Verified` i `Built` są listami nazw wyzwań przypisanych danemu graczowi; jeśli gracz nie ma jeszcze takich wpisów, użyj pustej tablicy. Gdy nazwa wyzwania istnieje na ZCL, karta wyzwania pokazuje graczy z pól `Verified` („Zweryfikowane przez”) i `Built` („Zbudowane przez”). Wyzwanie z `Verified` liczy się jako completion w ZCL, tak samo jak wpis w `ChallengeDemons`; to samo wyzwanie zapisane w obu polach liczy się tylko raz. `Built` nie wpływa na ukończenia ani punkty.

Paczki ZCL definiuje `lists/challenge/packs.json`. Każda paczka ma nazwę i listę leveli wskazanych nazwą oraz ID z `lists/challenge/levels.json`:

```json
[
  {
    "name": "Nazwa paczki",
    "levels": [
      { "name": "Nazwa levela", "id": "123456" }
    ]
  }
]
```

Gracz automatycznie zalicza paczkę po ukończeniu wszystkich jej leveli zapisanych w `ChallengeDemons` lub `Verified`; `Built` się nie liczy. Za paczkę przyznawany jest dodatkowy bonus równy średniej punktów jej leveli, zaokrąglonej do pełnego ZLP.
Na stronie „Paczki ZCL” wybierz paczkę z menu po lewej, aby zobaczyć jej levele, bonus i listę graczy, którzy ją ukończyli.

Podstrony rankingu, ostatnich ukończeń, zwycięzców i porównania wybierają odpowiedni plik graczy i zestaw ukończeń. W porównaniu graczy można dodawać dowolną liczbę osób do każdego z dwóch zespołów; wynik zespołu sumuje punkty jego graczy, a wspólne ukończenia są liczone na podstawie leveli ukończonych przez co najmniej jednego członka każdego zespołu. Linki otwierane z ZCL przekazują `?list=zcl`, dzięki czemu korzystają z `lists/challenge/levels.json` i `challenge-players.json`; bez tego parametru wyświetlane są dane ZLL z `lists/zll/levels.json` i `players.json`.

Kliknięcie nazwy ukończonego levela w szczegółach gracza na leaderboardzie otwiera `level.html?id=ID`. Strona pokazuje metadane levela oraz graczy, którzy go ukończyli; w ZCL adres zawiera również `list=zcl`. Osobna zakładka „LEVELE” nie jest już dostępna.

Linki do filmów z ukończeń zapisuj osobno dla każdej listy: ZCL w `links.json`, a ZLL w `lists/zll/levels-links.json`. Oba pliki używają tego samego formatu; każdy wpis łączy nazwę gracza, listę ID leveli z odpowiedniego `levels.json` pokazanych w filmie i adres tego filmu:

```json
[
  {
    "player": "Kicek1146",
    "levelId": ["148430500", "145484484"],
    "videoUrl": "https://www.youtube.com/watch?v=ID_FILMU"
  }
]
```

W rankingu odpowiedniej listy kafelek ukończonego poziomu staje się linkiem do filmu, jeśli istnieje pasujący wpis dla gracza i ID poziomu. Jeden film może mieć kilka ID w `levelId`; każdy z tych kafelków otworzy to samo wideo. Link otwiera się w nowej karcie. Jeśli dla poziomu jest osobny film, dodaj dla niego osobny obiekt. Dla zachowania zgodności nadal akceptowane jest pojedyncze ID jako tekst; przy braku linków plik może zawierać pustą tablicę `[]`.

Zakładka „Nowe Levele!” pokazuje aktywne levele dodane w ciągu ostatnich 7 dni. Przy dodawaniu wpisu do odpowiedniego `levels.json` ustaw pole `AddedAt` na datę w formacie `YYYY-MM-DD`; starsze wpisy bez tej daty nie pojawią się w zakładce. Pole `addedAt` jest także obsługiwane dla zgodności. Data jest też używana w changelogu leveli. W szczegółach gracza w leaderboardzie ukończone levele z tej zakładki mają oznaczenie `NEW` obok miejsca na liście.

Zakładka „Autorzy” grupuje aktywne levele według pola `Autor` w odpowiednim `levels.json`. Wpisz nazwę autora jako tekst, np. `"Autor": "Sevvend"`. Jeśli przy levelu nie ma autora, wpis nie pojawi się w tej zakładce.

Wspólne arkusze i skrypty są w `assets/css/` i `assets/js/`. Widoki list znajdują się w osobnych katalogach `lists/zll/` i `lists/challenge/`.

## Punktacja

Punktacja opada płynnie według wzoru `round(1 + 499 * ((N - r) / (N - 1))^1.8)`, gdzie `r` to pozycja levela, a `N` to liczba aktywnych leveli plus 20. TOP 1 daje 500 ZLP, a 1 ZLP przypada od rangi `N`; punkty pomiędzy nimi maleją stopniowo, bez osobnych progów dla TOP 10 czy TOP 20. ZLL i Challenge korzystają z tej samej krzywej, liczonej dla liczby aktywnych leveli na danej liście.

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
