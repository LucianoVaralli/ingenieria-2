#!/bin/bash
if [$# -eq 0]; then
    echo "debe proveer al menos un parametro"
    exit 1
fi
vector=()
agregar_archivos() {
    for archivo in "$1"/*; do
        if [ -f "$archivo" ]; then
            vector+=("$archivo")
        fi
    done
}

eliminar() {
    for ((i=0; i<"${#vector[@]}" ;i++)); do
        if [[ "${vector[i]}" == *$1 ]]; then
            unset vector[$i]
        fi
    done
    vector=("${vector[@]}")
}

eliminar_todo() {
    for ((i=0; i<"${#vector[@]}" ;i++)); do
        if [[ "${vector[i]}" == *$1 ]]; then
            rm "${vector[$i]}"
            unset vector[$i]
        fi
    done
    vector=("${vector[@]}")
}

agregar_archivos $1
case $2 in 
    "a")
        agregar_archivos $3
        ;;
    "d")
        if[$# -eq 3]; then
            eliminar $3
        else
            eliminar_todo $3
        ;;
esac

#!/bin/bash
if[$# -lt 1]; then
    echo "debe proveer al menos 1 parametro"
    exit 1
fi
cantidad=0
for i in "$@"; do
    if[-e "$i"];then
        directorio=$(dirname "$i")
        nombre=$(basename "$i")
        if[ -f "$i"]; then
            gzip "$i"
        elif[ -d "$i"]; then
            if[ -r "$i"]; then
                tar -czf "$directorio/$nombre.tar.gz" -C "$directorio" "$nombre"
            fi

            if[ -w "$i"]; then
                rm -rf "$i"
            fi
        fi
    else
        cantidad=$(expr $cantidad + 1)
    fi
done
echo "cantidad total de elementos que no existen: $cantidad"


#!/bin/bash
arreglo($(cut -d: -f1 /etc/passwd))
existe() {
    if[ $# -eq 0 ]; then
        echo "Debe proveer al menos un nombre de usuario para iniciar la busqueda"
        return 10
    fi
    for i in ${arreglo[@]}; do
        if[ "$i" == "$1" ]; then
            echo "0"
            return 0
        fi
    done
    echo "1"
    return 1
}

eliminar_usuario() {
    if[ $# -eq 0 ]; then
        echo "Debe proveer al menos un nombre de usuario para realizar la eliminacion"
        return 2
    fi
    if[ $(existe $1) == "0" ]; then
        for i in ${!arreglo[@]}; do
            if[ "${arreglo[$i]}" == "$1" ]; then
                unset arreglo[$i]
                arreglo=("${arreglo[@]}")
                return 0
            fi
        done
    fi
    return 2
}

usuario_con_patron() {
    if[ $# -eq 0 ]; then
        echo "Debe proveer al menos un patron para realizar el filtro"
        return 3
    fi
    cantidad=0
    for i in ${arreglo[@]}; do
        if[[ "$i" == *$1* ]]; then
            echo "$i contiene el patron pasado"
            cantidad=$(expr $cantidad + 1)
        fi
    done
    if[ "$cantidad" -eq 0 ]; then
        return 102
    fi
}

cantidad() {
    if[ ${#arreglo[@]} -eq 0 ]; then
        echo "arreglo vacio"
        return 95
    fi
    echo "${#arreglo[@]}"
}

usuarios() {
    if[ ${#arreglo[@]} -eq 0 ]; then
        echo "arreglo vacio"
        return 95
    fi
    echo "${arrerglo[@]}"
}


#!/bin/bash
if [ $# -eq 0 ]; then
    echo "debe proveer un patron"
    exit 1
fi
arreglo_sin_patron=($(cut -d: -f1 /etc/passwd))
patron=$1
arreglo=()
for i in "${arreglo_sin_patron[@]}"; do
    if [[ "$i" == *"$patron"* ]]; then
        arreglo+=("$i")
    fi
done

listar() {
    for i in "${!arreglo[@]}"; do
        echo "$i: ${arreglo[$i]}"
    done
}

eliminar() "{"
    listar
    echo "cual desea eliminar? (0 al ${#arreglo[@]})"
    read indice
    if [ ! -z "$indice" ] && [ "$indice" -ge 0 ] && [ "$indice" -lt "${#arreglo[@]}" ]; then
        unset arreglo[$indice]
        arreglo=("${arreglo[@]})
    fi
}"

contar() {
    echo "${#arreglo[@]}"
}

select opcion in "listar" "eliminar" "contar" "salir"; do
    case $opcion in
        "listar")
            listar
            ;;
        "eliminar")
            eliminar
            ;;
        "contar")
            contar
            ;;
        "salir")
            echo "Saliendo del script..."
            break # Rompe el ciclo select y finaliza el programa
            ;;
        *)
            echo "Opción inválida. Ingrese un número del 1 al 4."
            ;;
    esac
done


#!/bin/bash
if [ $# -eq 0 ]; then
    echo "debe proveer un nombre de usuario"
    exit 1
fi

usuario=$1

if grep -q "^$usuario:" /etc/passwd; then
    contador=0
    acces_usuario="access-$usuario.log"
    while [ "$contador" -ne 30 ]; do
        who | grep -q "^$usuario "
        if [ $? -eq 0 ]; then
            echo "$(date): El usuario $usuario esta logeado." >> "$acces_usuario"
            contador=$(expr $contador + 1)
        fi

        sleep 30
    done

    exit 0
else
    echo "usuario inexistente"
    exit 1
fi

#!/bin/bash
arreglo=($(find "/var/log" -name "*access*" -type f 2>/dev/null))

cantidad() {
    echo "${#arreglo[@]}"
}

lista() {
    echo "${arreglo[@]}"
}

eliminar() {
    if [ $# -lt 2 ]; then
        echo "debe prover un indice y un caracter"
        return 3
    fi
    indice=$1
    caracter=$2
    if [ ! -z "$indice" ] && [ "$indice" -ge 0 ] && [ "$indice" -lt $(cantidad)]; then
        if[ "$caracter" == "f" ]; then
            rm -f "${arreglo[$indice]}"
        fi
        unset arreglo[$indice]
        arreglo=("${arreglo[@]}")
    else
        echo "ingrese un indice valido"
        return 1
    fi
}

select opcion in "cantidad" "listar" "eliminar" "fin"; do
    case $opcion in
        "cantidad")
            cantidad
            ;;
        "listar")
            listar
            ;;
        "eliminar")
            echo "ingrese un indice valido (0-$(lista))"
            read indice
            echo "ingrese un caracter (i o f)"
            read caracter
            eliminar $indice $caracter
            ;;
        "fin")
            echo "saliendo del sistema..."
            exit 0
            ;;
        "*")
            echo "se equivoco de opcion"
            ;;
    esac
done
