# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "Sign in to your account" [level=2] [ref=e5]
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - text: Email address
          - textbox "Email address" [ref=e9]: admin@labamu.co.id
        - generic [ref=e10]:
          - text: Password
          - textbox "Password" [ref=e11]: admin123
      - generic [ref=e12]: Internal server error
      - button "Sign in" [ref=e14]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e20] [cursor=pointer]:
    - generic [ref=e23]:
      - text: Compiling
      - generic [ref=e24]:
        - generic [ref=e25]: .
        - generic [ref=e26]: .
        - generic [ref=e27]: .
  - alert [ref=e28]
```